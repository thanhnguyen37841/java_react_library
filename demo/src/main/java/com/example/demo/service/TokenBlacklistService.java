package com.example.demo.service;

import com.example.demo.entity.RevokedToken;
import com.example.demo.repository.RevokedTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Date;

@Service
@RequiredArgsConstructor
public class TokenBlacklistService {

    private final RevokedTokenRepository revokedTokenRepository;

    @Transactional
    public void blacklistToken(String jti, Date expiryDate) {
        if (jti == null || jti.isBlank() || expiryDate == null) {
            throw new IllegalArgumentException(
                    "JTI và thời gian hết hạn không được để trống"
            );
        }

        if (revokedTokenRepository.existsByJti(jti)) {
            return;
        }

        RevokedToken revokedToken = new RevokedToken();
        revokedToken.setJti(jti);
        revokedToken.setExpiryDate(
                LocalDateTime.ofInstant(
                        expiryDate.toInstant(),
                        ZoneOffset.UTC
                )
        );

        revokedTokenRepository.save(revokedToken);
    }

    @Transactional(readOnly = true)
    public boolean isBlacklisted(String jti) {
        if (jti == null || jti.isBlank()) {
            return false;
        }

        return revokedTokenRepository.existsByJti(jti);
    }
}