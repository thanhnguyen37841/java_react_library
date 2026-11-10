package com.example.demo.dto.response;

import com.example.demo.entity.enums.BorrowStatus;
import com.example.demo.entity.enums.LoanType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class BorrowResponse {
    private Long id;
    private String memberName;
    private String bookTitle;
    private Long bookId;
    private LocalDate borrowDate;
    private LocalDate dueDate;
    private LocalDate returnDate;
    private BorrowStatus status;
    private LoanType loanType;
    private LocalDateTime requestDate;
}