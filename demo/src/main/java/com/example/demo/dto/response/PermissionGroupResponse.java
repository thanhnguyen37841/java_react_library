
package com.example.demo.dto.response;

import com.example.demo.entity.PermissionGroup;

import java.util.List;

public record PermissionGroupResponse(
        Long id,
        String name,
        String description,
        List<Long> permissionIds,
        List<Long> userIds
) {

    public static PermissionGroupResponse from(PermissionGroup group) {
        return new PermissionGroupResponse(
            group.getId(),
            group.getName(),
            group.getDescription(),
            group.getPermissions()
                .stream()
                .map(permission -> permission.getId())
                .sorted()
                .toList(),
            group.getUsers()
                .stream()
                .map(user -> user.getId())
                .sorted()
                .toList()
        );
    }
}
