
package com.example.demo.controller;

import com.example.demo.dto.request.ChangeEmailRequest;
import com.example.demo.dto.request.ChangePasswordRequest;
import com.example.demo.dto.request.ConfirmChangeEmailRequest;
import com.example.demo.dto.request.ForgotPasswordRequest;
import com.example.demo.dto.request.ResetPasswordRequest;
import com.example.demo.service.AccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(
        value = "/account",
        produces = "text/plain;charset=UTF-8"
)
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    // API không yêu cầu đăng nhập.
    @PostMapping("/forgot-password")
    public ResponseEntity<String> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request
    ) {

        return ResponseEntity.ok(
                accountService.forgotPassword(request)
        );
    }

    // API không yêu cầu đăng nhập.
    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request
    ) {

        return ResponseEntity.ok(
                accountService.resetPassword(request)
        );
    }

    // Đổi mật khẩu: yêu cầu quyền ACCOUNT_CHANGE_PASSWORD.
    @PostMapping("/change-password")
    @PreAuthorize("hasAuthority('ACCOUNT_CHANGE_PASSWORD')")
    public ResponseEntity<String> changePassword(
            Authentication authentication,
            @Valid @RequestBody ChangePasswordRequest request
    ) {

        String currentEmail = authentication.getName();

        return ResponseEntity.ok(
                accountService.changePassword(currentEmail, request)
        );
    }

    // Bước 1: Gửi mã xác thực đến email mới.
    @PostMapping("/change-email")
    @PreAuthorize("hasAuthority('ACCOUNT_CHANGE_EMAIL')")
    public ResponseEntity<String> requestChangeEmail(
            Authentication authentication,
            @Valid @RequestBody ChangeEmailRequest request
    ) {

        String currentEmail = authentication.getName();

        return ResponseEntity.ok(
                accountService.requestChangeEmail(currentEmail, request)
        );
    }

    // Bước 2: Xác nhận mã để hoàn tất đổi email.
    @PostMapping("/confirm-change-email")
    @PreAuthorize("hasAuthority('ACCOUNT_CHANGE_EMAIL')")
    public ResponseEntity<String> confirmChangeEmail(
            Authentication authentication,
            @Valid @RequestBody ConfirmChangeEmailRequest request
    ) {

        String currentEmail = authentication.getName();

        return ResponseEntity.ok(
                accountService.confirmChangeEmail(currentEmail, request)
        );
    }
}
