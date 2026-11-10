package com.example.demo.controller;

import com.example.demo.dto.request.BorrowRequest;
import com.example.demo.dto.response.BorrowResponse;
import com.example.demo.entity.enums.BorrowStatus;
import com.example.demo.service.BorrowService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/borrows")
@RequiredArgsConstructor
@Tag(name = "Borrow Management", description = "API quản lý mượn/trả sách")
public class BorrowController {

    private final BorrowService borrowService;

    @GetMapping
    @PreAuthorize("hasAuthority('BORROW_READ')")
    public ResponseEntity<Page<BorrowResponse>> searchBorrowRecords(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) BorrowStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        return ResponseEntity.ok(
                borrowService.searchBorrowRecords(keyword, status, page, size)
        );
    }

    

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('BORROW_READ')")
    public ResponseEntity<BorrowResponse> getBorrowById(
            @PathVariable Long id) {

        return ResponseEntity.ok(borrowService.getBorrowById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('BORROW_CREATE')")
    public ResponseEntity<BorrowResponse> borrowBook(
            @Valid @RequestBody BorrowRequest request) {

        return ResponseEntity.ok(borrowService.borrowBook(request));
    }

    @PostMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BorrowResponse> requestPaperBorrow(
            @RequestParam Long bookId,
            Authentication authentication) {

        return ResponseEntity.ok(
                borrowService.requestPaperBorrow(
                        authentication.getName(),
                        bookId
                )
        );
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BorrowResponse> cancelPaperBorrow(
            @PathVariable Long id,
            Authentication authentication) {

        boolean canCancelAnyRequest = authentication.getAuthorities()
                .stream()
                .anyMatch(authority ->
                        "ROLE_ADMIN".equals(authority.getAuthority())
                                || "BORROW_CANCEL".equals(authority.getAuthority())
                );

        return ResponseEntity.ok(
                borrowService.cancelPaperBorrow(
                        authentication.getName(),
                        id,
                        canCancelAnyRequest
                )
        );
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('BORROW_APPROVE')")
    public ResponseEntity<BorrowResponse> approvePaperBorrow(
            @PathVariable Long id) {

        return ResponseEntity.ok(borrowService.approvePaperBorrow(id));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('BORROW_REJECT')")
    public ResponseEntity<BorrowResponse> rejectPaperBorrow(
            @PathVariable Long id) {

        return ResponseEntity.ok(borrowService.rejectPaperBorrow(id));
    }

    @PostMapping("/{id}/handover")
    @PreAuthorize("hasAuthority('BORROW_HANDOVER')")
    public ResponseEntity<BorrowResponse> handoverPaperBook(
            @PathVariable Long id) {

        return ResponseEntity.ok(borrowService.handoverPaperBook(id));
    }

    @PostMapping("/me/ebooks")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BorrowResponse> borrowEbook(
            @RequestParam Long bookId,
            Authentication authentication) {

        return ResponseEntity.ok(
                borrowService.borrowEbookForCurrentUser(
                        authentication.getName(),
                        bookId
                )
        );
    }

    @PutMapping("/{id}/return-online")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BorrowResponse> returnEbook(
            @PathVariable Long id,
            Authentication authentication) {

        return ResponseEntity.ok(
                borrowService.returnEbookForCurrentUser(
                        authentication.getName(),
                        id
                )
        );
    }

    @PutMapping("/{id}/return")
    @PreAuthorize("""
            hasRole('ADMIN')
            or hasAuthority('BORROW_CONFIRM_RETURN')
            or hasAuthority('BORROW_RETURN')
            """)
    @Operation(summary = "Xác nhận nhận lại sách giấy")
    public ResponseEntity<BorrowResponse> returnBook(
            @PathVariable Long id) {

        return ResponseEntity.ok(borrowService.returnBook(id));
    }
}