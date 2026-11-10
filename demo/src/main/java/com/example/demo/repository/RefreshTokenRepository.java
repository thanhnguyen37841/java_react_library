
package com.example.demo.repository;

import com.example.demo.entity.RefreshToken;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface RefreshTokenRepository
        extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByToken(String token);

    /**
     * Khóa refresh token khi xử lý rotation.
     * Phải gọi trong transaction.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT rt
        FROM RefreshToken rt
        WHERE rt.token = :token
        """)
    Optional<RefreshToken> findByTokenForUpdate(
            @Param("token") String token
    );

    void deleteByToken(String token);

    void deleteByUser_Id(Long userId);

    void deleteBySessionId(String sessionId);

    boolean existsByToken(String token);

    boolean existsBySessionIdAndUser_EmailAndExpiryDateAfter(
            String sessionId,
            String email,
            LocalDateTime now
    );
}
