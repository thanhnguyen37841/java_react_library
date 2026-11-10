package com.example.demo.exception;

/**
 * Dữ liệu xung đột với trạng thái hiện tại (ví dụ email đã được sử dụng).
 * GlobalExceptionHandler trả về HTTP 409.
 */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
