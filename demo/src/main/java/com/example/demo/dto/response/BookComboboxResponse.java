package com.example.demo.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class BookComboboxResponse {

    private Long id;
    private String title;
    private String isbn;
}