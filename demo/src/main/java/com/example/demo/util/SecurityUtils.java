package com.example.demo.util;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.util.StringUtils;

public class SecurityUtils {
    
    private SecurityUtils() {} // Ẩn constructor vì đây là class tiện ích

    public static String extractJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}