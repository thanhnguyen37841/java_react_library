package com.example.demo.controller;

import com.example.demo.dto.request.LoginRequest;
import com.example.demo.dto.request.TokenRefreshRequest;
import com.example.demo.dto.response.AuthResponse;
import com.example.demo.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/logout")
    public ResponseEntity<String> logout(
            HttpServletRequest request,
            @RequestBody(required = false) TokenRefreshRequest logoutRequest
    ) {
        String accessToken = com.example.demo.util.SecurityUtils
                .extractJwtFromRequest(request);
        String refreshToken = logoutRequest == null
                ? null
                : logoutRequest.getRefreshToken();

        if (!StringUtils.hasText(accessToken)
                && !StringUtils.hasText(refreshToken)) {
            return ResponseEntity.badRequest()
                    .body("Không có token để đăng xuất.");
        }

        authService.logout(accessToken, refreshToken);
        return ResponseEntity.ok("Đăng xuất thành công");
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<AuthResponse> refreshToken(@Valid @RequestBody TokenRefreshRequest request) {
        return ResponseEntity.ok(authService.refreshToken(request));
    }

    @PostMapping("/register")
    public ResponseEntity<String> register(@Valid @RequestBody com.example.demo.dto.request.RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @GetMapping("/verify")
    public ResponseEntity<String> verifyEmail(@RequestParam String token) {
        return ResponseEntity.ok(authService.verifyEmail(token));
    }
}