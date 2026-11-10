package com.example.demo.service;

import com.example.demo.entity.PermissionGroup;
import com.example.demo.repository.PermissionGroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PermissionGroupPermissionService {

    private final PermissionGroupRepository groupRepository;

    @Transactional(readOnly = true)
    public Set<Long> getPermissionIdsByUser(Long userId) {
        return groupRepository
                .findDistinctByUsers_IdAndDeletedFalse(userId)
                .stream()
                .map(PermissionGroup::getPermissions)
                .flatMap(Set::stream)
                .map(permission -> permission.getId())
                .collect(Collectors.toCollection(HashSet::new));
    }
}