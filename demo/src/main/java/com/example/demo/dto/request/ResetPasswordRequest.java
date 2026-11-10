package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ResetPasswordRequest {

    @NotBlank(message = "Token không được để trống.")
    private String token;

    @NotBlank(message = "Mật khẩu mới không được để trống.")
    private String newPassword;

    @NotBlank(message = "Mật khẩu xác nhận không được để trống.")
    private String confirmPassword;
}
