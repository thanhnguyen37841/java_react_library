package com.example.demo.controller;

import com.example.demo.dto.response.DashboardStatsResponse;
import com.example.demo.service.DashboardStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
public class DashboardStatsController {

    private final DashboardStatsService dashboardStatsService;

    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('REPORT_READ')")
    public ResponseEntity<DashboardStatsResponse> getStats() {
        return ResponseEntity.ok(
                dashboardStatsService.getDashboardStats()
        );
    }
}