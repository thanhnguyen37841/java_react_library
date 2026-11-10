
package com.example.demo.controller;

import com.example.demo.dto.request.UserPermissionUpdateRequest;
import com.example.demo.dto.response.UserPermissionResponse;
import com.example.demo.service.UserPermissionService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users/{userId}/permissions")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserPermissionController {

    private final UserPermissionService userPermissionService;

    @GetMapping
    public ResponseEntity<List<UserPermissionResponse>> getPermissions(
            @PathVariable Long userId) {

        return ResponseEntity.ok(
                userPermissionService.getUserPermissions(userId)
        );
    }

    @PutMapping
    public ResponseEntity<Map<String, String>> updatePermission(
            @PathVariable Long userId,
            @Valid @RequestBody UserPermissionUpdateRequest request) {

        userPermissionService.updatePermission(
                userId,
                request.getPermissionId(),
                request.getGranted()
        );

        return ResponseEntity.ok(Map.of(
                "message", "Cập nhật quyền thành công"
        ));
    }

    @DeleteMapping("/{permissionId}")
        public ResponseEntity<Map<String, String>> resetPermission(
                @PathVariable Long userId,
                @PathVariable Long permissionId) {

        userPermissionService.resetPermission(userId, permissionId);

        return ResponseEntity.ok(Map.of(
                "message", "Đã khôi phục quyền mặc định theo Role"
        ));
    }

}
