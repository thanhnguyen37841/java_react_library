package com.example.demo.security;

import com.example.demo.service.MemberService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Component
@RequiredArgsConstructor
public class ProfileCompletionFilter extends OncePerRequestFilter {

    private final MemberService memberService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        if (isExemptPath(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            filterChain.doFilter(request, response);
            return;
        }

        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(authority ->
                        "ROLE_ADMIN".equals(authority.getAuthority())
                );

        boolean isUser = authentication.getAuthorities().stream()
                .anyMatch(authority ->
                        "ROLE_USER".equals(authority.getAuthority())
                );

        // Không chặn Admin; chỉ bắt buộc hoàn thiện hồ sơ với ROLE_USER.
        if (isAdmin || !isUser) {
            filterChain.doFilter(request, response);
            return;
        }

        if (memberService.isProfileCompleteForEmail(
                authentication.getName()
        )) {
            filterChain.doFilter(request, response);
            return;
        }

        response.setStatus(428);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(
                MediaType.APPLICATION_JSON_VALUE + ";charset=UTF-8"
        );

        response.getWriter().write(
                """
                {
                  "code": "PROFILE_INCOMPLETE",
                  "message": "Vui lòng hoàn thiện hồ sơ cá nhân trước khi sử dụng chức năng này."
                }
                """
        );
    }

    private boolean isExemptPath(HttpServletRequest request) {
        String path = request.getRequestURI();
        String method = request.getMethod();

        if ("OPTIONS".equalsIgnoreCase(method)) {
            return true;
        }

        // Giữ các luồng đăng nhập, refresh token, logout và tài khoản.
        if (path.startsWith("/auth/")
                || path.startsWith("/account/")) {
            return true;
        }

        // Người dùng phải luôn truy cập được API hồ sơ của chính mình.
        if ("/api/members/me".equals(path)) {
            return true;
        }

        // App.jsx đang dùng endpoint này để khôi phục trạng thái phiên.
        return "/api/borrows/my".equals(path);
    }
}