
package com.example.demo.service;

import com.example.demo.dto.request.LoginRequest;
import com.example.demo.dto.request.RegisterRequest;
import com.example.demo.dto.request.TokenRefreshRequest;
import com.example.demo.dto.response.AuthResponse;
import com.example.demo.entity.RefreshToken;
import com.example.demo.entity.Role;
import com.example.demo.entity.User;
import com.example.demo.entity.VerificationToken;
import com.example.demo.entity.enums.RoleName;
import com.example.demo.repository.RefreshTokenRepository;
import com.example.demo.repository.RoleRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.repository.VerificationTokenRepository;
import com.example.demo.security.CustomUserDetails;
import com.example.demo.security.JwtTokenProvider;

import io.jsonwebtoken.Claims;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Date;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtTokenProvider tokenProvider;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TokenBlacklistService blacklistService;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private VerificationTokenRepository verificationTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private MailService mailService;

    @InjectMocks
    private AuthService authService;

    private User mockUser;

    private static final String VALID_PASSWORD = "Password123!";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(
                authService,
                "refreshTokenDurationMs",
                86400000L
        );

        mockUser = new User();
        mockUser.setId(1L);
        mockUser.setEmail("test@gmail.com");
        mockUser.setPassword("encoded_password");
        mockUser.setVerified(true);
    }

    // =========================================================
    // REGISTER
    // =========================================================

    @Test
    void register_Success() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("new@gmail.com");
        request.setPassword(VALID_PASSWORD);
        request.setConfirmPassword(VALID_PASSWORD);

        Role userRole = new Role();
        userRole.setName(RoleName.ROLE_USER);

        when(userRepository.findByEmail("new@gmail.com"))
                .thenReturn(Optional.empty());

        when(roleRepository.findByName(RoleName.ROLE_USER))
                .thenReturn(Optional.of(userRole));

        when(passwordEncoder.encode(VALID_PASSWORD))
                .thenReturn("hashedPass");

        when(userRepository.save(any(User.class)))
                .thenReturn(mockUser);

        String result = authService.register(request);

        assertEquals(
                "Đăng ký thành công. Vui lòng kiểm tra email để xác thực.",
                result
        );

        verify(userRepository).save(any(User.class));
        verify(verificationTokenRepository).save(any(VerificationToken.class));
        verify(mailService).sendVerificationEmail(
                eq("new@gmail.com"),
                anyString()
        );
    }

    @Test
    void register_EmailAlreadyExists() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("test@gmail.com");
        request.setPassword(VALID_PASSWORD);
        request.setConfirmPassword(VALID_PASSWORD);

        when(userRepository.findByEmail("test@gmail.com"))
                .thenReturn(Optional.of(mockUser));

        RuntimeException ex = assertThrows(
                RuntimeException.class,
                () -> authService.register(request)
        );

        assertEquals("Email đã được sử dụng!", ex.getMessage());

        verify(userRepository, never()).save(any(User.class));
        verify(verificationTokenRepository, never())
                .save(any(VerificationToken.class));
    }

    @Test
    void register_RoleNotFound() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("new@gmail.com");
        request.setPassword(VALID_PASSWORD);
        request.setConfirmPassword(VALID_PASSWORD);

        when(userRepository.findByEmail("new@gmail.com"))
                .thenReturn(Optional.empty());

        when(roleRepository.findByName(RoleName.ROLE_USER))
                .thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(
                RuntimeException.class,
                () -> authService.register(request)
        );

        assertEquals("Role không tồn tại", ex.getMessage());

        verify(userRepository, never()).save(any(User.class));
        verify(verificationTokenRepository, never())
                .save(any(VerificationToken.class));
    }

    @Test
    void register_MailSendingFails_ButRegistrationSucceeds() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("new@gmail.com");
        request.setPassword(VALID_PASSWORD);
        request.setConfirmPassword(VALID_PASSWORD);

        Role userRole = new Role();
        userRole.setName(RoleName.ROLE_USER);

        when(userRepository.findByEmail("new@gmail.com"))
                .thenReturn(Optional.empty());

        when(roleRepository.findByName(RoleName.ROLE_USER))
                .thenReturn(Optional.of(userRole));

        when(passwordEncoder.encode(VALID_PASSWORD))
                .thenReturn("hashedPass");

        when(userRepository.save(any(User.class)))
                .thenReturn(mockUser);

        doThrow(new RuntimeException("SMTP error"))
                .when(mailService)
                .sendVerificationEmail(eq("new@gmail.com"), anyString());

        String result = authService.register(request);

        assertEquals(
                "Đăng ký thành công. Vui lòng kiểm tra email để xác thực.",
                result
        );

        verify(userRepository).save(any(User.class));
        verify(verificationTokenRepository).save(any(VerificationToken.class));
        verify(mailService).sendVerificationEmail(
                eq("new@gmail.com"),
                anyString()
        );
    }

    // =========================================================
    // LOGIN
    // =========================================================

    @Test
    void login_Success() {
        LoginRequest request = new LoginRequest();
        request.setEmail("test@gmail.com");
        request.setPassword(VALID_PASSWORD);

        Authentication authentication = mock(Authentication.class);
        CustomUserDetails userDetails = new CustomUserDetails(mockUser);

        when(authenticationManager.authenticate(
                any(UsernamePasswordAuthenticationToken.class)
        )).thenReturn(authentication);

        when(authentication.getPrincipal()).thenReturn(userDetails);

        when(userRepository.findByIdForUpdate(1L))
                .thenReturn(Optional.of(mockUser));

        when(tokenProvider.generateToken(
                eq(authentication),
                anyString()
        )).thenReturn("access-token");

        RefreshToken savedRefreshToken = new RefreshToken();
        savedRefreshToken.setToken("refresh-token");

        when(refreshTokenRepository.save(any(RefreshToken.class)))
                .thenReturn(savedRefreshToken);

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("access-token", response.getAccessToken());
        assertEquals("refresh-token", response.getRefreshToken());
        assertEquals("Bearer", response.getTokenType());

        verify(authenticationManager).authenticate(
                any(UsernamePasswordAuthenticationToken.class)
        );

        verify(userRepository).findByIdForUpdate(1L);
        verify(refreshTokenRepository).deleteByUser_Id(1L);
        verify(refreshTokenRepository).flush();

        verify(tokenProvider).generateToken(
                eq(authentication),
                anyString()
        );

        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    void login_AuthenticationFails() {
        LoginRequest request = new LoginRequest();
        request.setEmail("test@gmail.com");
        request.setPassword("wrong");

        RuntimeException exception =
                new RuntimeException("Bad credentials");

        when(authenticationManager.authenticate(
                any(UsernamePasswordAuthenticationToken.class)
        )).thenThrow(exception);

        RuntimeException ex = assertThrows(
                RuntimeException.class,
                () -> authService.login(request)
        );

        assertEquals("Bad credentials", ex.getMessage());

        verify(userRepository, never()).findByIdForUpdate(anyLong());
        verify(refreshTokenRepository, never()).save(any(RefreshToken.class));
    }

    // =========================================================
    // LOGOUT
    // =========================================================

    @Test
    void logout_Success() {
        String accessToken = "access-token";
        String sessionId = "session-123";
        String jti = "jti-123";

        Date expiryDate =
                new Date(System.currentTimeMillis() + 3600000);

        Claims claims = mock(Claims.class);

        when(tokenProvider.getClaimsForLogout(accessToken))
                .thenReturn(claims);

        when(claims.get("sessionId", String.class))
                .thenReturn(sessionId);

        when(claims.getId())
                .thenReturn(jti);

        when(claims.getExpiration())
                .thenReturn(expiryDate);

        authService.logout(accessToken, null);

        verify(tokenProvider).getClaimsForLogout(accessToken);
        verify(blacklistService).blacklistToken(jti, expiryDate);
        verify(refreshTokenRepository).deleteBySessionId(sessionId);
    }

    // =========================================================
    // REFRESH TOKEN
    // =========================================================

    @Test
    void refreshToken_Success() {
        String oldRefreshTokenValue = "old-refresh-token";
        String sessionId = "session-123";

        TokenRefreshRequest request = new TokenRefreshRequest();
        request.setRefreshToken(oldRefreshTokenValue);

        RefreshToken oldToken = new RefreshToken();
        oldToken.setToken(oldRefreshTokenValue);
        oldToken.setExpiryDate(LocalDateTime.now().plusHours(1));
        oldToken.setUser(mockUser);
        oldToken.setSessionId(sessionId);

        RefreshToken newToken = new RefreshToken();
        newToken.setToken("new-refresh-token");

        when(refreshTokenRepository.findByTokenForUpdate(
                oldRefreshTokenValue
        )).thenReturn(Optional.of(oldToken));

        when(tokenProvider.generateTokenFromUsername(
                "test@gmail.com",
                sessionId
        )).thenReturn("new-access-token");

        when(refreshTokenRepository.save(any(RefreshToken.class)))
                .thenReturn(newToken);

        AuthResponse response = authService.refreshToken(request);

        assertNotNull(response);
        assertEquals("new-access-token", response.getAccessToken());
        assertEquals("new-refresh-token", response.getRefreshToken());
        assertEquals("Bearer", response.getTokenType());

        verify(refreshTokenRepository)
                .findByTokenForUpdate(oldRefreshTokenValue);

        verify(refreshTokenRepository).delete(oldToken);
        verify(refreshTokenRepository).flush();

        verify(tokenProvider).generateTokenFromUsername(
                "test@gmail.com",
                sessionId
        );

        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    void refreshToken_NotFound() {
        TokenRefreshRequest request = new TokenRefreshRequest();
        request.setRefreshToken("invalid-token");

        when(refreshTokenRepository.findByTokenForUpdate("invalid-token"))
                .thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(
                RuntimeException.class,
                () -> authService.refreshToken(request)
        );

        assertEquals(
                "Refresh token không tồn tại hoặc phiên đã bị vô hiệu hóa.",
                ex.getMessage()
        );

        verify(refreshTokenRepository)
                .findByTokenForUpdate("invalid-token");

        verify(refreshTokenRepository, never()).delete(any(RefreshToken.class));
        verify(refreshTokenRepository, never()).save(any(RefreshToken.class));
        verify(tokenProvider, never())
                .generateTokenFromUsername(anyString(), anyString());
    }

    @Test
    void refreshToken_Expired() {
        TokenRefreshRequest request = new TokenRefreshRequest();
        request.setRefreshToken("expired-token");

        RefreshToken expiredToken = new RefreshToken();
        expiredToken.setToken("expired-token");
        expiredToken.setExpiryDate(LocalDateTime.now().minusMinutes(1));
        expiredToken.setUser(mockUser);
        expiredToken.setSessionId("session-expired");

        when(refreshTokenRepository.findByTokenForUpdate("expired-token"))
                .thenReturn(Optional.of(expiredToken));

        RuntimeException ex = assertThrows(
                RuntimeException.class,
                () -> authService.refreshToken(request)
        );

        assertEquals(
                "Refresh token đã hết hạn. Vui lòng đăng nhập lại.",
                ex.getMessage()
        );

        verify(refreshTokenRepository)
                .findByTokenForUpdate("expired-token");

        // AuthService hiện tại không xóa token trong nhánh hết hạn.
        verify(refreshTokenRepository, never()).delete(expiredToken);
        verify(refreshTokenRepository, never()).flush();
        verify(refreshTokenRepository, never()).save(any(RefreshToken.class));

        verify(tokenProvider, never())
                .generateTokenFromUsername(anyString(), anyString());
    }

    // =========================================================
    // VERIFY EMAIL
    // =========================================================

    @Test
    void verifyEmail_Success() {
        VerificationToken verificationToken = new VerificationToken();
        verificationToken.setToken("verify-token");
        verificationToken.setExpiryDate(LocalDateTime.now().plusHours(1));
        verificationToken.setUser(mockUser);

        when(verificationTokenRepository.findByToken("verify-token"))
                .thenReturn(Optional.of(verificationToken));

        String result = authService.verifyEmail("verify-token");

        assertEquals(
                "Xác thực email thành công! Bạn có thể đăng nhập hệ thống.",
                result
        );

        assertTrue(mockUser.isVerified());

        verify(userRepository).save(mockUser);
        verify(verificationTokenRepository).delete(verificationToken);
    }

    @Test
    void verifyEmail_TokenNotFound() {
        when(verificationTokenRepository.findByToken("invalid-token"))
                .thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(
                RuntimeException.class,
                () -> authService.verifyEmail("invalid-token")
        );

        assertEquals("Token xác thực không hợp lệ.", ex.getMessage());

        verify(userRepository, never()).save(any(User.class));
        verify(verificationTokenRepository, never())
                .delete(any(VerificationToken.class));
    }

    @Test
    void verifyEmail_TokenExpired() {
        VerificationToken verificationToken = new VerificationToken();
        verificationToken.setToken("expired-token");
        verificationToken.setExpiryDate(LocalDateTime.now().minusMinutes(1));
        verificationToken.setUser(mockUser);

        when(verificationTokenRepository.findByToken("expired-token"))
                .thenReturn(Optional.of(verificationToken));

        RuntimeException ex = assertThrows(
                RuntimeException.class,
                () -> authService.verifyEmail("expired-token")
        );

        assertEquals("Token xác thực đã hết hạn.", ex.getMessage());

        verify(userRepository, never()).save(any(User.class));
        verify(verificationTokenRepository, never())
                .delete(any(VerificationToken.class));
    }
}
