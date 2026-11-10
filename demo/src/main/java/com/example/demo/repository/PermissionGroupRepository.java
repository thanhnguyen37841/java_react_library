package com.example.demo.repository;

import com.example.demo.entity.PermissionGroup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PermissionGroupRepository
        extends JpaRepository<PermissionGroup, Long> {

    Optional<PermissionGroup> findByNameIgnoreCase(String name);

    List<PermissionGroup> findDistinctByUsers_Id(Long userId);

    // Chỉ lấy nhóm đang hoạt động khi tính quyền và hiển thị nhóm.
    List<PermissionGroup> findDistinctByUsers_IdAndDeletedFalse(
            Long userId
    );

    List<PermissionGroup> findAllByDeletedFalse();

    List<PermissionGroup> findAllByDeletedTrue();

    Optional<PermissionGroup> findByIdAndDeletedFalse(Long id);

    Optional<PermissionGroup> findByIdAndDeletedTrue(Long id);
}