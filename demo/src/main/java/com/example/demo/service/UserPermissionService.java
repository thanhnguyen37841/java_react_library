package com.example.demo.service;

import com.example.demo.dto.response.UserPermissionResponse;
import com.example.demo.entity.Permission;
import com.example.demo.entity.PermissionGroup;
import com.example.demo.entity.Role;
import com.example.demo.entity.User;
import com.example.demo.entity.UserPermissionOverride;
import com.example.demo.repository.PermissionGroupRepository;
import com.example.demo.repository.PermissionRepository;
import com.example.demo.repository.UserPermissionOverrideRepository;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserPermissionService {

    private final UserRepository userRepository;
    private final PermissionRepository permissionRepository;
    private final UserPermissionOverrideRepository overrideRepository;
    private final PermissionGroupRepository groupRepository;

    @Transactional(readOnly = true)
    public List<UserPermissionResponse> getUserPermissions(Long userId) {
        User user = findUser(userId);

        Set<Long> basePermissionIds = user.getRoles().stream()
                .map(Role::getPermissions)
                .flatMap(Set::stream)
                .map(Permission::getId)
                .collect(Collectors.toSet());

        // Chỉ nhóm đang hoạt động mới được cấp quyền.
        List<PermissionGroup> groups =
                groupRepository.findDistinctByUsers_IdAndDeletedFalse(userId);

        groups.stream()
                .map(PermissionGroup::getPermissions)
                .flatMap(Set::stream)
                .map(Permission::getId)
                .forEach(basePermissionIds::add);

        Map<Long, UserPermissionOverride> overrides =
                overrideRepository.findByUser_Id(userId).stream()
                        .collect(Collectors.toMap(
                                override -> override.getPermission().getId(),
                                Function.identity()
                        ));

        return permissionRepository.findAll().stream()
                .map(permission -> {
                    Long permissionId = permission.getId();

                    boolean roleGranted =
                            basePermissionIds.contains(permissionId);

                    UserPermissionOverride override =
                            overrides.get(permissionId);

                    Boolean overrideGranted = override == null
                            ? null
                            : override.isGranted();

                    boolean effectiveGranted = override == null
                            ? roleGranted
                            : override.isGranted();

                    return new UserPermissionResponse(
                            permissionId,
                            permission.getName(),
                            permission.getDescription(),
                            roleGranted,
                            overrideGranted,
                            effectiveGranted
                    );
                })
                .toList();
    }

    @Transactional
    public void updatePermission(
            Long userId,
            Long permissionId,
            boolean granted) {

        User user = findUser(userId);

        Permission permission = permissionRepository.findById(permissionId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy Permission"
                ));

        UserPermissionOverride override = overrideRepository
                .findByUser_IdAndPermission_Id(userId, permissionId)
                .orElseGet(() -> {
                    UserPermissionOverride newOverride =
                            new UserPermissionOverride();

                    newOverride.setUser(user);
                    newOverride.setPermission(permission);

                    return newOverride;
                });

        override.setGranted(granted);
        overrideRepository.save(override);
    }

    @Transactional
    public void resetPermission(Long userId, Long permissionId) {
        findUser(userId);

        if (!permissionRepository.existsById(permissionId)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy Permission"
            );
        }

        // Đây là xóa bản ghi override để trở về quyền kế thừa,
        // không phải xóa dữ liệu nghiệp vụ.
        overrideRepository
                .findByUser_IdAndPermission_Id(userId, permissionId)
                .ifPresent(overrideRepository::delete);
    }

    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy User"
                ));
    }
}