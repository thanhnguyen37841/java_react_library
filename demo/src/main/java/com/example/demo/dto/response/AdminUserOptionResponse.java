package com.example.demo.dto.response;

public record AdminUserOptionResponse(
        Long id,
        String email,
        String fullName,
        boolean verified
) {
}