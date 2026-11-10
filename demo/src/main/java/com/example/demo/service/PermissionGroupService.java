package com.example.demo.service;

import com.example.demo.dto.request.PermissionGroupRequest;
import com.example.demo.dto.response.PermissionGroupResponse;
import com.example.demo.entity.Permission;
import com.example.demo.entity.PermissionGroup;
import com.example.demo.entity.User;
import com.example.demo.entity.enums.RoleName;
import com.example.demo.repository.PermissionGroupRepository;
import com.example.demo.repository.PermissionRepository;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PermissionGroupService {

    private final PermissionGroupRepository groupRepository;
    private final PermissionRepository permissionRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<PermissionGroupResponse> getAllGroups() {
        return groupRepository.findAllByDeletedFalse()
                .stream()
                .map(PermissionGroupResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PermissionGroupResponse> getDeletedGroups() {
        return groupRepository.findAllByDeletedTrue()
                .stream()
                .map(PermissionGroupResponse::from)
                .toList();
    }

    @Transactional
    public PermissionGroupResponse createGroup(
            PermissionGroupRequest request,
            Authentication authentication) {

        validatePermissionAssignment(
                request.getPermissionIds(),
                authentication
        );

        validateName(request.getName());

        groupRepository.findByNameIgnoreCase(request.getName().trim())
                .ifPresent(group -> {
                    if (group.isDeleted()) {
                        throw new IllegalArgumentException(
                                "Tên này thuộc nhóm quyền trong thùng rác. "
                                        + "Hãy khôi phục nhóm đó hoặc dùng tên khác."
                        );
                    }

                    throw new IllegalArgumentException(
                            "Tên nhóm quyền đã tồn tại"
                    );
                });

        PermissionGroup group = new PermissionGroup();
        group.setName(request.getName().trim());
        group.setDescription(request.getDescription());
        group.setDeleted(false);
        group.setDeletedAt(null);
        group.setPermissions(loadPermissions(request.getPermissionIds()));

        return PermissionGroupResponse.from(
                groupRepository.save(group)
        );
    }

    @Transactional
    public PermissionGroupResponse updateGroup(
            Long groupId,
            PermissionGroupRequest request,
            Authentication authentication) {

        validatePermissionAssignment(
                request.getPermissionIds(),
                authentication
        );

        validateName(request.getName());

        PermissionGroup group = groupRepository
                .findByIdAndDeletedFalse(groupId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Không tìm thấy nhóm quyền đang hoạt động"
                        )
                );

        groupRepository.findByNameIgnoreCase(request.getName().trim())
                .filter(existing -> !existing.getId().equals(groupId))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException(
                            existing.isDeleted()
                                    ? "Tên này thuộc nhóm quyền trong thùng rác"
                                    : "Tên nhóm quyền đã tồn tại"
                    );
                });

        group.setName(request.getName().trim());
        group.setDescription(request.getDescription());
        group.setPermissions(loadPermissions(request.getPermissionIds()));

        return PermissionGroupResponse.from(
                groupRepository.save(group)
        );
    }

    // Xóa mềm: không xóa nhóm, liên kết quyền hoặc liên kết người dùng.
    @Transactional
    public void deleteGroup(Long groupId) {
        PermissionGroup group = groupRepository
                .findByIdAndDeletedFalse(groupId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Không tìm thấy nhóm quyền đang hoạt động"
                        )
                );

        group.setDeleted(true);
        group.setDeletedAt(LocalDateTime.now());

        groupRepository.save(group);
    }

    // Khôi phục nhóm quyền đã xóa mềm.
    @Transactional
    public PermissionGroupResponse restoreGroup(
            Long groupId,
            Authentication authentication) {

        PermissionGroup group = groupRepository
                .findByIdAndDeletedTrue(groupId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Không tìm thấy nhóm quyền trong thùng rác"
                        )
                );

        // Không cho phép nhân viên khôi phục nhóm chứa quyền vượt quá quyền của mình.
        validatePermissionEntitiesForActor(
                group.getPermissions(),
                authentication
        );

        groupRepository.findByNameIgnoreCase(group.getName())
                .filter(existing -> !existing.getId().equals(groupId))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException(
                            "Không thể khôi phục vì tên nhóm quyền đã được sử dụng"
                    );
                });

        group.setDeleted(false);
        group.setDeletedAt(null);

        return PermissionGroupResponse.from(
                groupRepository.save(group)
        );
    }

    @Transactional
    public void assignUsers(
            Long groupId,
            Set<Long> userIds,
            Authentication authentication) {

        PermissionGroup group = groupRepository
                .findByIdAndDeletedFalse(groupId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Không tìm thấy nhóm quyền đang hoạt động"
                        )
                );

        // Không được gán nhóm chứa quyền mà người thực hiện không sở hữu.
        validatePermissionEntitiesForActor(
                group.getPermissions(),
                authentication
        );

        Set<Long> safeUserIds = userIds == null
                ? Set.of()
                : userIds;

        List<User> users = userRepository.findAllById(safeUserIds);

        if (users.size() != safeUserIds.size()) {
            throw new IllegalArgumentException(
                    "Một hoặc nhiều tài khoản không tồn tại"
            );
        }

        // Chặn ROLE_ADMIN kể cả khi request được gửi thủ công.
        boolean containsAdmin = users.stream()
                .flatMap(user -> user.getRoles().stream())
                .anyMatch(role -> role.getName() == RoleName.ROLE_ADMIN);

        if (containsAdmin) {
            throw new IllegalArgumentException(
                    "Không thể gán tài khoản quản trị viên vào nhóm quyền"
            );
        }

        group.getUsers().addAll(users);
        groupRepository.save(group);
    }

    @Transactional
    public void removeUser(Long groupId, Long userId) {
        PermissionGroup group = groupRepository
                .findByIdAndDeletedFalse(groupId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Không tìm thấy nhóm quyền đang hoạt động"
                        )
                );

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Không tìm thấy tài khoản"
                        )
                );

        // Chỉ xóa liên kết User - nhóm, không xóa tài khoản.
        group.getUsers().remove(user);
        groupRepository.save(group);
    }

    @Transactional(readOnly = true)
    public List<PermissionGroupResponse> getGroupsByUser(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new IllegalArgumentException(
                    "Không tìm thấy tài khoản"
            );
        }

        return groupRepository
                .findDistinctByUsers_IdAndDeletedFalse(userId)
                .stream()
                .map(PermissionGroupResponse::from)
                .toList();
    }

    // =====================================================
    // KIỂM TRA QUYỀN ĐƯỢC PHÉP CẤP
    // =====================================================

    private void validatePermissionAssignment(
            Set<Long> permissionIds,
            Authentication authentication) {

        if (isAdmin(authentication)) {
            return;
        }

        Set<Permission> requestedPermissions =
                loadPermissions(permissionIds);

        validatePermissionEntitiesForActor(
                requestedPermissions,
                authentication
        );
    }

    private void validatePermissionEntitiesForActor(
            Set<Permission> requestedPermissions,
            Authentication authentication) {

        if (isAdmin(authentication)) {
            return;
        }

        Set<String> actorAuthorities =
                getActorAuthorities(authentication);

        boolean containsUnauthorizedPermission =
                requestedPermissions.stream()
                        .anyMatch(permission ->
                                !actorAuthorities.contains(permission.getName())
                        );

        if (containsUnauthorizedPermission) {
            throw new AccessDeniedException(
                    "Bạn chỉ được cấp những quyền mà tài khoản của bạn đang sở hữu"
            );
        }
    }

    private boolean isAdmin(Authentication authentication) {
        return getActorAuthorities(authentication)
                .contains("ROLE_ADMIN");
    }

    private Set<String> getActorAuthorities(
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException(
                    "Không xác định được tài khoản thực hiện thao tác"
            );
        }

        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(java.util.stream.Collectors.toSet());
    }

    // =====================================================
    // TIỆN ÍCH
    // =====================================================

    private Set<Permission> loadPermissions(Set<Long> permissionIds) {
        if (permissionIds == null || permissionIds.isEmpty()) {
            return new HashSet<>();
        }

        List<Permission> permissions =
                permissionRepository.findAllById(permissionIds);

        if (permissions.size() != permissionIds.size()) {
            throw new IllegalArgumentException(
                    "Một hoặc nhiều quyền không tồn tại"
            );
        }

        return new HashSet<>(permissions);
    }

    private void validateName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException(
                    "Tên nhóm quyền không được để trống"
            );
        }

        if (name.trim().length() > 100) {
            throw new IllegalArgumentException(
                    "Tên nhóm quyền tối đa 100 ký tự"
            );
        }
    }
}