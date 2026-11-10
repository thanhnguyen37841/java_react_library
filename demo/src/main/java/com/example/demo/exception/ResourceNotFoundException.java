package com.example.demo.exception;

/**
 * Không tìm thấy dữ liệu được yêu cầu (sách, danh mục, tài khoản, ...).
 * GlobalExceptionHandler trả về HTTP 404.
 *
 * Kế thừa RuntimeException nên Spring tự rollback transaction như trước.
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
