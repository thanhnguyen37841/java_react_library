package com.example.demo.controller;

import com.example.demo.dto.request.PermissionGroupRequest;
import com.example.demo.dto.request.PermissionGroupUsersRequest;
import com.example.demo.dto.response.AdminUserOptionResponse;
import com.example.demo.dto.response.PermissionGroupResponse;
import com.example.demo.entity.enums.RoleName;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.PermissionGroupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/permission-groups")
@RequiredArgsConstructor
public class AdminPermissionGroupController {

    private final PermissionGroupService groupService;
    private final UserRepository userRepository;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('PERMISSION_GROUP_READ')")
    public ResponseEntity<List<PermissionGroupResponse>> getAllGroups() {
        return ResponseEntity.ok(groupService.getAllGroups());
    }

    @GetMapping("/trash")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('PERMISSION_GROUP_READ')")
    public ResponseEntity<List<PermissionGroupResponse>> getDeletedGroups() {
        return ResponseEntity.ok(groupService.getDeletedGroups());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('PERMISSION_GROUP_CREATE')")
    public ResponseEntity<PermissionGroupResponse> createGroup(
            @Valid @RequestBody PermissionGroupRequest request,
            Authentication authentication) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(groupService.createGroup(request, authentication));
    }

    @PutMapping("/{groupId}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('PERMISSION_GROUP_UPDATE')")
    public ResponseEntity<PermissionGroupResponse> updateGroup(
            @PathVariable Long groupId,
            @Valid @RequestBody PermissionGroupRequest request,
            Authentication authentication) {

        return ResponseEntity.ok(
                groupService.updateGroup(groupId, request, authentication)
        );
    }

    @DeleteMapping("/{groupId}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('PERMISSION_GROUP_DELETE')")
    public ResponseEntity<Void> deleteGroup(
            @PathVariable Long groupId) {

        groupService.deleteGroup(groupId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{groupId}/restore")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('PERMISSION_GROUP_UPDATE')")
    public ResponseEntity<PermissionGroupResponse> restoreGroup(
            @PathVariable Long groupId,
            Authentication authentication) {

        return ResponseEntity.ok(
                groupService.restoreGroup(groupId, authentication)
        );
    }

    // API riêng để tìm người dùng được phép gán vào nhóm.
    // Tài khoản ROLE_ADMIN không được trả về.
    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('PERMISSION_GROUP_UPDATE')")
    public ResponseEntity<Page<AdminUserOptionResponse>> getAssignableUsers(
            @RequestParam(defaultValue = "") String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "8") int size) {

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);

        Pageable pageable = PageRequest.of(
                safePage,
                safeSize,
                Sort.by(Sort.Direction.DESC, "id")
        );

        return ResponseEntity.ok(
                userRepository.searchPermissionGroupAssignableUsers(
                        keyword.trim(),
                        RoleName.ROLE_ADMIN,
                        pageable
                )
        );
    }

    @PostMapping("/{groupId}/users")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('PERMISSION_GROUP_UPDATE')")
    public ResponseEntity<Map<String, String>> assignUsers(
            @PathVariable Long groupId,
            @Valid @RequestBody PermissionGroupUsersRequest request,
            Authentication authentication) {

        groupService.assignUsers(
                groupId,
                request.getUserIds(),
                authentication
        );

        return ResponseEntity.ok(
                Map.of("message", "Đã gán tài khoản vào nhóm quyền")
        );
    }

    @DeleteMapping("/{groupId}/users/{userId}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('PERMISSION_GROUP_UPDATE')")
    public ResponseEntity<Void> removeUser(
            @PathVariable Long groupId,
            @PathVariable Long userId) {

        groupService.removeUser(groupId, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/users/{userId}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('PERMISSION_GROUP_READ')")
    public ResponseEntity<List<PermissionGroupResponse>> getGroupsByUser(
            @PathVariable Long userId) {

        return ResponseEntity.ok(
                groupService.getGroupsByUser(userId)
        );
    }
}