package com.example.demo.dto.response;

import com.example.demo.entity.Permission;

public record PermissionOptionResponse(
        Long id,
        String name,
        String description,
        String category,
        String categoryLabel
) {
    public static PermissionOptionResponse from(Permission permission) {
        String name = permission.getName();
        String category = getCategory(name);

        return new PermissionOptionResponse(
                permission.getId(),
                name,
                permission.getDescription(),
                category,
                getCategoryLabel(category)
        );
    }

    private static String getCategory(String permissionName) {
        if (permissionName == null || !permissionName.contains("_")) {
            return "OTHER";
        }

        return permissionName.substring(
                0,
                permissionName.indexOf('_')
        );
    }

    private static String getCategoryLabel(String category) {
        return switch (category) {
            case "BOOK" -> "Quản lý sách";
            case "CATEGORY" -> "Quản lý danh mục";
            case "MEMBER" -> "Quản lý thành viên";
            case "BORROW" -> "Quản lý mượn trả";
            case "ACCOUNT" -> "Quản lý tài khoản";
            case "SYSTEM" -> "Quản lý hệ thống";
            case "REPORT" -> "Báo cáo thống kê";
            case "PERMISSION" -> "Quản lý nhóm quyền";
            default -> "Quyền khác";
        };
    }
}