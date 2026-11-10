
package com.example.demo.service;

import com.example.demo.dto.request.LoginRequest;
import com.example.demo.dto.request.TokenRefreshRequest;
import com.example.demo.dto.response.AuthResponse;
import com.example.demo.entity.RefreshToken;
import com.example.demo.entity.User;
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
import org.mockito.ArgumentCaptor;
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
class AuthSessionLifecycleTest {

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

    private User user;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(
                authService,
                "refreshTokenDurationMs",
                86_400_000L
        );

        user = new User();
        user.setId(1L);
        user.setEmail("member@example.com");
        user.setPassword("encoded-password");
        user.setVerified(true);
    }

    @Test
    void login_CreatesRefreshTokenWithSessionId() {
        LoginRequest request = new LoginRequest();
        request.setEmail("member@example.com");
        request.setPassword("Password123!");

        Authentication authentication = mock(Authentication.class);
        CustomUserDetails userDetails = new CustomUserDetails(user);

        when(authenticationManager.authenticate(
                any(UsernamePasswordAuthenticationToken.class)
        )).thenReturn(authentication);

        when(authentication.getPrincipal()).thenReturn(userDetails);

        when(userRepository.findByIdForUpdate(user.getId()))
                .thenReturn(Optional.of(user));

        when(tokenProvider.generateToken(
                eq(authentication),
                anyString()
        )).thenReturn("access-token");

        when(refreshTokenRepository.save(any(RefreshToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("access-token", response.getAccessToken());
        assertEquals("Bearer", response.getTokenType());
        assertNotNull(response.getRefreshToken());

        ArgumentCaptor<RefreshToken> tokenCaptor =
                ArgumentCaptor.forClass(RefreshToken.class);

        verify(refreshTokenRepository).save(tokenCaptor.capture());

        RefreshToken savedToken = tokenCaptor.getValue();

        assertEquals(user, savedToken.getUser());
        assertNotNull(savedToken.getSessionId());
        assertFalse(savedToken.getSessionId().isBlank());
        assertNotNull(savedToken.getToken());
        assertEquals(response.getRefreshToken(), savedToken.getToken());
        assertNotNull(savedToken.getExpiryDate());
        assertTrue(savedToken.getExpiryDate().isAfter(LocalDateTime.now()));

        verify(tokenProvider).generateToken(
                eq(authentication),
                eq(savedToken.getSessionId())
        );

        verify(refreshTokenRepository).deleteByUser_Id(user.getId());
        verify(refreshTokenRepository).flush();
    }

    @Test
    void login_CreatesDifferentSessionIdForEachLogin() {
        LoginRequest request = new LoginRequest();
        request.setEmail("member@example.com");
        request.setPassword("Password123!");

        Authentication authentication = mock(Authentication.class);
        CustomUserDetails userDetails = new CustomUserDetails(user);

        when(authenticationManager.authenticate(
                any(UsernamePasswordAuthenticationToken.class)
        )).thenReturn(authentication);

        when(authentication.getPrincipal()).thenReturn(userDetails);

        when(userRepository.findByIdForUpdate(user.getId()))
                .thenReturn(Optional.of(user));

        when(tokenProvider.generateToken(
                eq(authentication),
                anyString()
        )).thenReturn("access-token");

        when(refreshTokenRepository.save(any(RefreshToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        AuthResponse firstResponse = authService.login(request);
        AuthResponse secondResponse = authService.login(request);

        ArgumentCaptor<RefreshToken> tokenCaptor =
                ArgumentCaptor.forClass(RefreshToken.class);

        verify(refreshTokenRepository, times(2))
                .save(tokenCaptor.capture());

        String firstSessionId =
                tokenCaptor.getAllValues().get(0).getSessionId();

        String secondSessionId =
                tokenCaptor.getAllValues().get(1).getSessionId();

        assertNotNull(firstResponse);
        assertNotNull(secondResponse);
        assertNotEquals(firstSessionId, secondSessionId);

        // Theo AuthService hiện tại, login mới xóa refresh token cũ
        // của cùng tài khoản trước khi tạo phiên mới.
        verify(refreshTokenRepository, times(2))
                .deleteByUser_Id(user.getId());

        verify(refreshTokenRepository, times(2)).flush();
    }

    @Test
    void logout_BlacklistsAccessTokenAndDeletesOnlyItsSession() {
        String accessToken = "access-token";
        String refreshToken = "refresh-token";
        String sessionId = "session-123";
        String jti = "jti-123";

        Date expiryDate = new Date(
                System.currentTimeMillis() + 3_600_000
        );

        Claims claims = mock(Claims.class);

        RefreshToken storedRefreshToken = new RefreshToken();
        storedRefreshToken.setToken(refreshToken);
        storedRefreshToken.setUser(user);
        storedRefreshToken.setSessionId(sessionId);
        storedRefreshToken.setExpiryDate(
                LocalDateTime.now().plusHours(1)
        );

        when(refreshTokenRepository.findByTokenForUpdate(refreshToken))
                .thenReturn(Optional.of(storedRefreshToken));

        when(tokenProvider.getClaimsForLogout(accessToken))
                .thenReturn(claims);

        when(claims.get("sessionId", String.class))
                .thenReturn(sessionId);

        when(claims.getId()).thenReturn(jti);
        when(claims.getExpiration()).thenReturn(expiryDate);

        authService.logout(accessToken, refreshToken);

        verify(tokenProvider).getClaimsForLogout(accessToken);
        verify(blacklistService).blacklistToken(jti, expiryDate);
        verify(refreshTokenRepository).deleteBySessionId(sessionId);

        verify(refreshTokenRepository, never())
                .deleteByUser_Id(anyLong());
    }

    @Test
    void logout_WithMissingRefreshToken_UsesSessionFromAccessToken() {
        String accessToken = "access-token";
        String sessionId = "session-from-access";
        String jti = "jti-from-access";

        Date expiryDate = new Date(
                System.currentTimeMillis() + 3_600_000
        );

        Claims claims = mock(Claims.class);

        when(tokenProvider.getClaimsForLogout(accessToken))
                .thenReturn(claims);

        when(claims.get("sessionId", String.class))
                .thenReturn(sessionId);

        when(claims.getId()).thenReturn(jti);
        when(claims.getExpiration()).thenReturn(expiryDate);

        authService.logout(accessToken, null);

        verify(blacklistService).blacklistToken(jti, expiryDate);
        verify(refreshTokenRepository).deleteBySessionId(sessionId);
        verify(refreshTokenRepository, never())
                .deleteByUser_Id(anyLong());
    }

    @Test
    void refreshToken_WhenTokenDoesNotExist_ThrowsException() {
        TokenRefreshRequest request = new TokenRefreshRequest();
        request.setRefreshToken("revoked-refresh-token");

        when(refreshTokenRepository.findByTokenForUpdate(
                "revoked-refresh-token"
        )).thenReturn(Optional.empty());

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> authService.refreshToken(request)
        );

        assertEquals(
                "Refresh token không tồn tại hoặc phiên đã bị vô hiệu hóa.",
                exception.getMessage()
        );

        verify(refreshTokenRepository, never())
                .save(any(RefreshToken.class));

        verify(tokenProvider, never())
                .generateTokenFromUsername(anyString(), anyString());
    }

    @Test
    void refreshToken_WhenTokenExpired_RejectsExpiredToken() {
        RefreshToken expiredToken = new RefreshToken();
        expiredToken.setToken("expired-refresh-token");
        expiredToken.setUser(user);
        expiredToken.setSessionId("session-expired");
        expiredToken.setExpiryDate(
                LocalDateTime.now().minusMinutes(1)
        );

        TokenRefreshRequest request = new TokenRefreshRequest();
        request.setRefreshToken("expired-refresh-token");

        when(refreshTokenRepository.findByTokenForUpdate(
                "expired-refresh-token"
        )).thenReturn(Optional.of(expiredToken));

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> authService.refreshToken(request)
        );

        assertEquals(
                "Refresh token đã hết hạn. Vui lòng đăng nhập lại.",
                exception.getMessage()
        );

        // verifyExpiration() hiện tại chỉ từ chối token hết hạn;
        // không xóa token trong nhánh này.
        verify(refreshTokenRepository, never()).delete(expiredToken);
        verify(refreshTokenRepository, never()).flush();
        verify(refreshTokenRepository, never())
                .save(any(RefreshToken.class));

        verify(tokenProvider, never())
                .generateTokenFromUsername(anyString(), anyString());
    }
}
