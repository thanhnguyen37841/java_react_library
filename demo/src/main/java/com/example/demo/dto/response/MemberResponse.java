package com.example.demo.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class MemberResponse {

    private Long id;
    private String fullName;
    private LocalDate dateOfBirth;

    private String phoneNumber;
    private String address;

    private String email;
    private boolean isVerified;
}