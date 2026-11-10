package com.example.demo.dto.response;

public record CategoryStatisticsResponse(
        Long id,
        String name,
        String description,
        Long totalBooks,
        Long totalQuantity,
        Long availableQuantity
) {
}