package com.example.demo.controller;

import com.example.demo.entity.PermissionGroup;
import com.example.demo.entity.enums.RoleName;
import com.example.demo.repository.PermissionGroupRepository;
import com.example.demo.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/me")
@RequiredArgsConstructor
public class CurrentUserPermissionController {

    private final PermissionGroupRepository permissionGroupRepository;

    @GetMapping("/permissions")
    public Map<String, Object> getCurrentUserPermissions(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        if (userDetails == null || userDetails.getUser() == null) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Không xác định được tài khoản đang đăng nhập."
            );
        }

        Long userId = userDetails.getUser().getId();
        Set<String> permissions = userDetails.getEffectivePermissions();

        boolean isAdmin = userDetails.getUser()
                .getRoles()
                .stream()
                .anyMatch(role -> role.getName() == RoleName.ROLE_ADMIN);

        // STAFF phải được gán nhóm quyền có tên STAFF.
        // Quyền BOOK_READ đơn lẻ không làm tài khoản thành STAFF.
        boolean isStaff = !isAdmin
                && permissionGroupRepository
                        .findDistinctByUsers_IdAndDeletedFalse(userId)
                        .stream()
                        .map(PermissionGroup::getName)
                        .filter(name -> name != null)
                        .anyMatch(name ->
                                name.trim().equalsIgnoreCase("STAFF"));

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("userId", userId);
        response.put("email", userDetails.getUsername());
        response.put("admin", isAdmin);
        response.put("staff", isStaff);
        response.put("permissions", permissions);

        return response;
    }
}