package com.example.demo.repository;

import com.example.demo.entity.ChangeEmailToken;
import com.example.demo.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ChangeEmailTokenRepository extends JpaRepository<ChangeEmailToken, Long> {
    Optional<ChangeEmailToken> findByUserAndCode(User user, String code);
    void deleteByUser(User user);
}