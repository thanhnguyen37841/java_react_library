
package com.example.demo.controller;

import com.example.demo.dto.response.BorrowResponse;
import com.example.demo.entity.enums.BorrowStatus;
import com.example.demo.service.BorrowService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

@RestController
@RequestMapping("/api/borrows")
@RequiredArgsConstructor
public class UserBorrowController {

    private static final int DEFAULT_PAGE_SIZE = 10;
    private static final int MAX_PAGE_SIZE = 10;

    private final BorrowService borrowService;

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<BorrowResponse>> getMyBorrowRecords(
            Principal principal,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) BorrowStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        if (principal == null || principal.getName() == null
                || principal.getName().isBlank()) {
            return ResponseEntity.status(401).build();
        }

        if (page < 0) {
            return ResponseEntity.badRequest().build();
        }

        if (size < 1 || size > MAX_PAGE_SIZE) {
            return ResponseEntity.badRequest().build();
        }

        Page<BorrowResponse> result =
                borrowService.searchMyBorrowRecords(
                        principal.getName(),
                        keyword,
                        status,
                        page,
                        Math.min(size, DEFAULT_PAGE_SIZE)
                );

        return ResponseEntity.ok(result);
    }
}
