package com.example.demo.repository;

import com.example.demo.entity.UserPermissionOverride;
import com.example.demo.entity.UserPermissionOverride.UserPermissionOverrideId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserPermissionOverrideRepository
        extends JpaRepository<UserPermissionOverride, UserPermissionOverrideId> {

    List<UserPermissionOverride> findByUser_Id(Long userId);

    Optional<UserPermissionOverride> findByUser_IdAndPermission_Id(
            Long userId, Long permissionId);

    void deleteByUser_Id(Long userId);
}
