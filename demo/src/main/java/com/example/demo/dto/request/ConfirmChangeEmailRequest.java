package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ConfirmChangeEmailRequest {
    @NotBlank(message = "Mã xác thực không được để trống")
    private String code;
}