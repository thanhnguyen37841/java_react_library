
package com.example.demo.controller;

import com.example.demo.service.SystemConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/configs")
@RequiredArgsConstructor
public class SystemConfigController {

    private final SystemConfigService configService;

    /**
     * Đọc trạng thái bảo trì.
     * Chỉ admin có quyền đọc cấu hình hệ thống mới được truy cập.
     */
    @GetMapping("/maintenance")
    @PreAuthorize("hasRole('ADMIN') and hasAuthority('SYSTEM_CONFIG_READ')")
    public ResponseEntity<Boolean> getMaintenanceStatus() {
        return ResponseEntity.ok(
                configService.isMaintenanceMode()
        );
    }

    /**
     * Bật hoặc tắt chế độ bảo trì.
     *
     * Khi bảo trì đang bật, MaintenanceModeFilter chỉ cho phép
     * request PUT với status=false đi tiếp.
     *
     * Spring Security tiếp tục xác thực JWT và kiểm tra quyền admin
     * cùng quyền SYSTEM_CONFIG_UPDATE trước khi thực thi phương thức.
     */
    @PutMapping("/maintenance")
    @PreAuthorize("hasRole('ADMIN') and hasAuthority('SYSTEM_CONFIG_UPDATE')")
    public ResponseEntity<String> toggleMaintenance(
            @RequestParam boolean status
    ) {
        configService.toggleMaintenanceMode(status);

        String message = status
                ? "Hệ thống đã BẬT chế độ bảo trì"
                : "Hệ thống đã TẮT chế độ bảo trì";

        return ResponseEntity.ok(message);
    }
}
