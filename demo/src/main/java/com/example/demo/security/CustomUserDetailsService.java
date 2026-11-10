package com.example.demo.security;

import com.example.demo.entity.PermissionGroup;
import com.example.demo.entity.User;
import com.example.demo.entity.UserPermissionOverride;
import com.example.demo.repository.PermissionGroupRepository;
import com.example.demo.repository.UserPermissionOverrideRepository;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final UserPermissionOverrideRepository overrideRepository;
    private final PermissionGroupRepository permissionGroupRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email)
            throws UsernameNotFoundException {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "User not found with email: " + email
                ));

        Set<String> effectivePermissions = new HashSet<>();

        // 1. Quyền kế thừa từ Role.
        user.getRoles().forEach(role ->
                role.getPermissions().forEach(permission ->
                        effectivePermissions.add(permission.getName())
                )
        );

        // 2. Chỉ kế thừa quyền từ nhóm chưa bị xóa mềm.
        List<PermissionGroup> groups =
                permissionGroupRepository
                        .findDistinctByUsers_IdAndDeletedFalse(user.getId());

        groups.forEach(group ->
                group.getPermissions().forEach(permission ->
                        effectivePermissions.add(permission.getName())
                )
        );

        // 3. Áp dụng override cá nhân sau cùng.
        List<UserPermissionOverride> overrides =
                overrideRepository.findByUser_Id(user.getId());

        for (UserPermissionOverride override : overrides) {
            String permissionName =
                    override.getPermission().getName();

            if (override.isGranted()) {
                effectivePermissions.add(permissionName);
            } else {
                effectivePermissions.remove(permissionName);
            }
        }

        return new CustomUserDetails(user, effectivePermissions);
    }
}