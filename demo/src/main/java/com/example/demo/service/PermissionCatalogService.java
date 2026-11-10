package com.example.demo.service;

import com.example.demo.dto.response.PermissionOptionResponse;
import com.example.demo.repository.PermissionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PermissionCatalogService {

    private final PermissionRepository permissionRepository;

    public PermissionCatalogService(
            PermissionRepository permissionRepository
    ) {
        this.permissionRepository = permissionRepository;
    }

    @Transactional(readOnly = true)
    public List<PermissionOptionResponse> getAllPermissions() {
        return permissionRepository
                .findAllByOrderByNameAsc()
                .stream()
                .map(PermissionOptionResponse::from)
                .toList();
    }
}