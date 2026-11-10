
package com.example.demo.service;

import com.example.demo.exception.ConflictException;
import com.example.demo.exception.UnauthorizedException;
import io.jsonwebtoken.Claims;

import com.example.demo.dto.request.LoginRequest;
import com.example.demo.dto.request.RegisterRequest;
import com.example.demo.dto.request.TokenRefreshRequest;
import com.example.demo.dto.response.AuthResponse;
import com.example.demo.entity.RefreshToken;
import com.example.demo.entity.Role;
import com.example.demo.entity.User;
import com.example.demo.entity.VerificationToken;
import com.example.demo.repository.RefreshTokenRepository;
import com.example.demo.repository.RoleRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.repository.VerificationTokenRepository;
import com.example.demo.security.CustomUserDetails;
import com.example.demo.security.JwtTokenProvider;
import com.example.demo.util.PasswordPolicy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Date;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;
    private final TokenBlacklistService blacklistService;
    private final RoleRepository roleRepository;
    private final VerificationTokenRepository verificationTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;

    @Value("${app.jwt.refresh-token-expiration}")
    private long refreshTokenDurationMs;

    /**
     * Đăng nhập và tạo phiên mới.
     *
     * Chính sách: mỗi tài khoản chỉ có một phiên đăng nhập hoạt động.
     * Khóa bản ghi User để tuần tự hóa các lần login đồng thời.
     */
    @Transactional
    public AuthResponse login(LoginRequest request) {
        Authentication authentication =
                authenticationManager.authenticate(
                        new UsernamePasswordAuthenticationToken(
                                request.getEmail(),
                                request.getPassword()
                        )
                );

        CustomUserDetails userDetails =
                (CustomUserDetails) authentication.getPrincipal();

        Long userId = userDetails.getUser().getId();

        // Khóa bản ghi tài khoản cho đến khi transaction kết thúc.
        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() ->
                        new UnauthorizedException("Tài khoản không tồn tại.")
                );

        // Thu hồi refresh token của tất cả phiên trước.
        // Filter JWT sẽ từ chối access token cũ vì sessionId không còn
        // được đại diện bởi refresh token đang hoạt động trong database.
        refreshTokenRepository.deleteByUser_Id(user.getId());
        refreshTokenRepository.flush();

        String sessionId = UUID.randomUUID().toString();

        String accessToken = tokenProvider.generateToken(
                authentication,
                sessionId
        );

        RefreshToken refreshToken = createRefreshToken(
                user,
                sessionId
        );

        return new AuthResponse(
                accessToken,
                refreshToken.getToken(),
                "Bearer"
        );
    }

    /**
     * Đăng xuất phiên hiện tại.
     *
     * Blacklist access token và xóa refresh token của sessionId đó.
     */
    @Transactional
    public void logout(String accessToken, String requestRefreshToken) {
        String sessionId = null;

        // Ưu tiên refresh token đang lưu trong DB để xác định chính xác
        // phiên cần thu hồi, kể cả khi access token đã hết hạn.
        if (requestRefreshToken != null && !requestRefreshToken.isBlank()) {
            RefreshToken storedRefreshToken = refreshTokenRepository
                    .findByTokenForUpdate(requestRefreshToken)
                    .orElse(null);

            if (storedRefreshToken != null) {
                sessionId = storedRefreshToken.getSessionId();
            }
        }

        // Claims vẫn có thể đọc từ JWT hết hạn nếu chữ ký hợp lệ.
        // Nếu refresh token đã bị thay thế, chỉ thu hồi sessionId của
        // access token cũ; không thể ảnh hưởng phiên đăng nhập mới.
        if (accessToken != null && !accessToken.isBlank()) {
            Claims claims = null;
            try {
                claims = tokenProvider.getClaimsForLogout(accessToken);
            } catch (RuntimeException ex) {
                // Có refresh token trong DB thì vẫn có thể thu hồi phiên đó
                // dù access token gửi kèm đã hỏng hoặc không còn hợp lệ.
                if (sessionId == null || sessionId.isBlank()) {
                    throw ex;
                }
                log.debug("Access token không hợp lệ khi logout: {}", ex.getMessage());
            }

            if (claims != null) {
                String accessSessionId = claims.get("sessionId", String.class);
                String jti = claims.getId();
                Date expiryDate = claims.getExpiration();

                if (sessionId == null || sessionId.isBlank()) {
                    sessionId = accessSessionId;
                }

                if (jti != null && !jti.isBlank() && expiryDate != null) {
                    blacklistService.blacklistToken(jti, expiryDate);
                }
            }
        }

        if (sessionId != null && !sessionId.isBlank()) {
            refreshTokenRepository.deleteBySessionId(sessionId);
        } else if (requestRefreshToken != null && !requestRefreshToken.isBlank()) {
            // Refresh token không còn tồn tại nghĩa là phiên có thể đã
            // bị thu hồi trước đó; không tác động tới phiên khác.
            refreshTokenRepository.deleteByToken(requestRefreshToken);
        }
    }

    /**
     * Refresh token rotation.
     *
     * Refresh token cũ chỉ được sử dụng một lần.
     * Access token mới tiếp tục gắn với sessionId hiện tại.
     */
    @Transactional
    public AuthResponse refreshToken(TokenRefreshRequest request) {
        String requestRefreshToken = request.getRefreshToken();

        RefreshToken oldRefreshToken = refreshTokenRepository
                .findByTokenForUpdate(requestRefreshToken)
                .orElseThrow(() ->
                        new UnauthorizedException(
                                "Refresh token không tồn tại hoặc phiên đã bị vô hiệu hóa."
                        )
                );

        verifyExpiration(oldRefreshToken);

        String sessionId = oldRefreshToken.getSessionId();

        if (sessionId == null || sessionId.isBlank()) {
            refreshTokenRepository.delete(oldRefreshToken);
            refreshTokenRepository.flush();

            throw new UnauthorizedException(
                    "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại."
            );
        }

        User user = oldRefreshToken.getUser();

        // Xóa token cũ trước khi tạo token mới.
        refreshTokenRepository.delete(oldRefreshToken);
        refreshTokenRepository.flush();

        String accessToken = tokenProvider.generateTokenFromUsername(
                user.getEmail(),
                sessionId
        );

        RefreshToken newRefreshToken = createRefreshToken(
                user,
                sessionId
        );

        return new AuthResponse(
                accessToken,
                newRefreshToken.getToken(),
                "Bearer"
        );
    }

    private RefreshToken createRefreshToken(
            User user,
            String sessionId
    ) {
        RefreshToken refreshToken = new RefreshToken();

        refreshToken.setUser(user);
        refreshToken.setToken(UUID.randomUUID().toString());
        refreshToken.setSessionId(sessionId);
        refreshToken.setExpiryDate(
                LocalDateTime.now().plusSeconds(
                        refreshTokenDurationMs / 1000
                )
        );

        return refreshTokenRepository.save(refreshToken);
    }

    private RefreshToken verifyExpiration(RefreshToken token) {
        if (!token.getExpiryDate().isAfter(LocalDateTime.now())) {
            throw new UnauthorizedException(
                    "Refresh token đã hết hạn. Vui lòng đăng nhập lại."
            );
        }

        return token;
    }

    /**
     * Đăng ký tài khoản.
     */
    @Transactional
    public String register(RegisterRequest request) {
        PasswordPolicy.validate(
                request.getPassword(),
                request.getConfirmPassword()
        );

        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ConflictException("Email đã được sử dụng!");
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setVerified(false);

        Role userRole = roleRepository
                .findByName(
                        com.example.demo.entity.enums.RoleName.ROLE_USER
                )
                .orElseThrow(() ->
                        new RuntimeException("Role không tồn tại")
                );

        user.getRoles().add(userRole);
        userRepository.save(user);

        VerificationToken verificationToken = new VerificationToken();
        verificationToken.setUser(user);
        verificationToken.setToken(UUID.randomUUID().toString());
        verificationToken.setExpiryDate(
                LocalDateTime.now().plusHours(24)
        );

        verificationTokenRepository.save(verificationToken);

        try {
            mailService.sendVerificationEmail(
                    user.getEmail(),
                    verificationToken.getToken()
            );
        } catch (Exception e) {
            log.warn(
                    "Không gửi được email xác thực cho {}: {}",
                    user.getEmail(),
                    e.getMessage()
            );
        }

        return "Đăng ký thành công. Vui lòng kiểm tra email để xác thực.";
    }

    /**
     * Xác thực email.
     */
    @Transactional
    public String verifyEmail(String token) {
        VerificationToken verificationToken =
                verificationTokenRepository.findByToken(token)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Token xác thực không hợp lệ."
                                )
                        );

        if (verificationToken.getExpiryDate()
                .isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException(
                    "Token xác thực đã hết hạn."
            );
        }

        User user = verificationToken.getUser();
        user.setVerified(true);

        userRepository.save(user);
        verificationTokenRepository.delete(verificationToken);

        return "Xác thực email thành công! Bạn có thể đăng nhập hệ thống.";
    }
}
