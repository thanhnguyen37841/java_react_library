
package com.example.demo.security;

import com.example.demo.repository.RefreshTokenRepository;
import com.example.demo.service.TokenBlacklistService;
import com.example.demo.util.SecurityUtils;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;
    private final CustomUserDetailsService customUserDetailsService;
    private final TokenBlacklistService tokenBlacklistService;
    private final RefreshTokenRepository refreshTokenRepository;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // Logout tự xác minh claims và refresh token trong AuthService.
        // Bỏ qua JWT filter ở endpoint này để access token hết hạn không
        // chặn việc thu hồi đúng phiên đăng nhập.
        return "POST".equalsIgnoreCase(request.getMethod())
                && "/auth/logout".equals(request.getServletPath());
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String jwt = SecurityUtils.extractJwtFromRequest(request);

        if (!StringUtils.hasText(jwt)) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            // 1. Kiểm tra chữ ký, thời hạn và cấu trúc JWT.
            if (!tokenProvider.validateToken(jwt)) {
                reject(response, "JWT không hợp lệ hoặc đã hết hạn.");
                return;
            }

            // 2. Từ chối access token đã bị blacklist khi logout.
            String jti = tokenProvider.getJtiFromJWT(jwt);

            if (tokenBlacklistService.isBlacklisted(jti)) {
                reject(response, "Token đã bị vô hiệu hóa.");
                return;
            }

            // 3. Lấy danh tính và sessionId từ JWT.
            String email = tokenProvider.getUsernameFromJWT(jwt);
            String sessionId = tokenProvider.getSessionIdFromJWT(jwt);

            if (!StringUtils.hasText(email)
                    || !StringUtils.hasText(sessionId)) {
                reject(response, "Token không chứa thông tin phiên hợp lệ.");
                return;
            }

            // 4. Xác minh sessionId còn hiệu lực với đúng tài khoản.
            // Sử dụng đúng method đã khai báo trong RefreshTokenRepository.
            boolean activeSession =
                    refreshTokenRepository
                            .existsBySessionIdAndUser_EmailAndExpiryDateAfter(
                                    sessionId,
                                    email,
                                    LocalDateTime.now()
                            );

            if (!activeSession) {
                reject(
                        response,
                        "Phiên đăng nhập đã bị thu hồi hoặc hết hạn. "
                                + "Vui lòng đăng nhập lại."
                );
                return;
            }

            // 5. Nạp UserDetails và thiết lập SecurityContext.
            UserDetails userDetails =
                    customUserDetailsService.loadUserByUsername(email);

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );

            authentication.setDetails(
                    new WebAuthenticationDetailsSource()
                            .buildDetails(request)
            );

            SecurityContextHolder.getContext()
                    .setAuthentication(authentication);

        } catch (Exception ex) {
            SecurityContextHolder.clearContext();

            logger.warn(
                    "JWT authentication failed: " + ex.getMessage()
            );

            reject(response, "Không thể xác thực phiên đăng nhập.");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private void reject(
            HttpServletResponse response,
            String message
    ) throws IOException {

        SecurityContextHolder.clearContext();

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        response.getWriter().write(
                "{\"status\":401,\"message\":\"" + message + "\"}"
        );
    }
}
