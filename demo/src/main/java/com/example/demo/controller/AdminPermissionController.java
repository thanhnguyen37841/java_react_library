package com.example.demo.controller;

import com.example.demo.dto.response.PermissionOptionResponse;
import com.example.demo.service.PermissionCatalogService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/permissions")
public class AdminPermissionController {

    private final PermissionCatalogService permissionCatalogService;

    public AdminPermissionController(
            PermissionCatalogService permissionCatalogService
    ) {
        this.permissionCatalogService = permissionCatalogService;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasAnyAuthority('PERMISSION_GROUP_CREATE', 'PERMISSION_GROUP_UPDATE')")
    public List<PermissionOptionResponse> getAllPermissions(
            Authentication authentication) {

        Set<String> authorities = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toSet());

        // Admin được xem toàn bộ danh mục quyền.
        if (authorities.contains("ROLE_ADMIN")) {
            return permissionCatalogService.getAllPermissions();
        }

        // Nhân viên chỉ thấy các quyền mà chính họ đang sở hữu.
        return permissionCatalogService.getAllPermissions().stream()
                .filter(permission ->
                        authorities.contains(permission.name())
                )
                .toList();
    }
}