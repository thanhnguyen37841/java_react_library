package com.example.demo.exception;

/**
 * Phiên đăng nhập / refresh token không hợp lệ hoặc đã hết hạn.
 * GlobalExceptionHandler trả về HTTP 401 để client biết cần đăng nhập lại.
 */
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(String message) {
        super(message);
    }
}
