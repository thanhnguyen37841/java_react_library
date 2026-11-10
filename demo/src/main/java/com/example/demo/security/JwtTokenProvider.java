
package com.example.demo.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.UUID;

@Slf4j
@Component
public class JwtTokenProvider {

    private static final String SESSION_ID_CLAIM = "sessionId";

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.access-token-expiration}")
    private long jwtExpirationInMs;

    private SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(jwtSecret);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    private Claims getClaimsFromJWT(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String generateToken(
            Authentication authentication,
            String sessionId
    ) {
        CustomUserDetails principal =
                (CustomUserDetails) authentication.getPrincipal();

        return generateTokenFromUsername(
                principal.getUsername(),
                sessionId
        );
    }

    /**
     * Giữ tương thích với mã nguồn cũ.
     * Luồng đăng nhập chính phải truyền sessionId tường minh.
     */
    @Deprecated
    public String generateToken(Authentication authentication) {
        return generateToken(
                authentication,
                UUID.randomUUID().toString()
        );
    }

    public String generateTokenFromUsername(
            String username,
            String sessionId
    ) {
        if (!StringUtils.hasText(username)) {
            throw new IllegalArgumentException(
                    "Username không được để trống."
            );
        }

        if (!StringUtils.hasText(sessionId)) {
            throw new IllegalArgumentException(
                    "SessionId không được để trống."
            );
        }

        Date now = new Date();
        Date expiryDate = new Date(
                now.getTime() + jwtExpirationInMs
        );

        return Jwts.builder()
                .subject(username)
                .id(UUID.randomUUID().toString())
                .claim(SESSION_ID_CLAIM, sessionId)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey())
                .compact();
    }

    @Deprecated
    public String generateTokenFromUsername(String username) {
        return generateTokenFromUsername(
                username,
                UUID.randomUUID().toString()
        );
    }

    /**
     * Đọc claims của JWT đã ký để xử lý logout, kể cả khi access token
     * vừa hết hạn. ExpiredJwtException vẫn chứa claims sau khi chữ ký đã
     * được xác minh; JWT sai chữ ký hoặc sai định dạng vẫn bị từ chối.
     */
    public Claims getClaimsForLogout(String token) {
        try {
            return getClaimsFromJWT(token);
        } catch (ExpiredJwtException ex) {
            return ex.getClaims();
        }
    }

    public String getUsernameFromJWT(String token) {
        return getClaimsFromJWT(token).getSubject();
    }

    public String getJtiFromJWT(String token) {
        return getClaimsFromJWT(token).getId();
    }

    public String getSessionIdFromJWT(String token) {
        return getClaimsFromJWT(token)
                .get(SESSION_ID_CLAIM, String.class);
    }

    public Date getExpirationDateFromJWT(String token) {
        return getClaimsFromJWT(token).getExpiration();
    }

    public boolean validateToken(String token) {
        try {
            Claims claims = getClaimsFromJWT(token);

            return StringUtils.hasText(claims.getSubject())
                    && StringUtils.hasText(claims.getId())
                    && StringUtils.hasText(
                            claims.get(
                                    SESSION_ID_CLAIM,
                                    String.class
                            )
                    )
                    && claims.getExpiration() != null;
        } catch (ExpiredJwtException ex) {
            log.debug("JWT đã hết hạn.");
        } catch (MalformedJwtException ex) {
            log.debug("JWT sai định dạng.");
        } catch (UnsupportedJwtException ex) {
            log.debug("JWT không được hỗ trợ.");
        } catch (IllegalArgumentException ex) {
            log.debug("JWT rỗng hoặc không hợp lệ.");
        } catch (JwtException ex) {
            log.debug("JWT không hợp lệ: {}", ex.getMessage());
        }

        return false;
    }
}
