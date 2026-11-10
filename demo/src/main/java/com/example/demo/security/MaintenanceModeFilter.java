
package com.example.demo.security;

import com.example.demo.service.SystemConfigService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class MaintenanceModeFilter extends OncePerRequestFilter {

    private static final String MAINTENANCE_API =
            "/api/configs/maintenance";

    private static final String LOGIN_API = "/auth/login";

    private static final String STATUS_PARAMETER = "status";

    private final SystemConfigService configService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        // Nếu không bật bảo trì, cho phép request đi tiếp.
        if (!configService.isMaintenanceMode()) {
            filterChain.doFilter(request, response);
            return;
        }

        // Cho phép đăng nhập để Admin có thể truy cập hệ thống.
        if (isLoginRequest(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        // Cho phép gọi API tắt chế độ bảo trì.
        // Việc xác thực và kiểm tra quyền vẫn do Spring Security xử lý.
        if (isAuthorizedMaintenanceDisableRequest(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        // Các request còn lại bị chặn khi hệ thống đang bảo trì.
        writeMaintenanceResponse(response);
    }

    /**
     * Cho phép GET và POST đến API đăng nhập.
     */
    private boolean isLoginRequest(HttpServletRequest request) {

        String method = request.getMethod();

        return LOGIN_API.equals(request.getServletPath())
                && (HttpMethod.GET.matches(method)
                || HttpMethod.POST.matches(method));
    }

    /**
     * Chỉ cho phép đúng API PUT có status=false đi tiếp.
     */
    private boolean isAuthorizedMaintenanceDisableRequest(
            HttpServletRequest request
    ) {

        return HttpMethod.PUT.matches(request.getMethod())
                && MAINTENANCE_API.equals(request.getServletPath())
                && "false".equalsIgnoreCase(
                        request.getParameter(STATUS_PARAMETER)
                );
    }

    /**
     * Trả về thông báo khi hệ thống đang bảo trì.
     */
    private void writeMaintenanceResponse(
            HttpServletResponse response
    ) throws IOException {

        response.setStatus(
                HttpStatus.SERVICE_UNAVAILABLE.value()
        );

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Cache-Control", "no-store");

        response.getWriter().write(
                "{\"status\":503,"
                        + "\"message\":\"Hệ thống đang bảo trì. "
                        + "Vui lòng quay lại sau!\"}"
        );
    }
}
