
package com.example.demo.controller;

import com.example.demo.dto.request.BookRequest;
import com.example.demo.dto.response.BookComboboxResponse;
import com.example.demo.dto.response.BookResponse;
import com.example.demo.service.BookCoverService;
import com.example.demo.service.BookImportService;
import com.example.demo.service.BookService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/books")
@RequiredArgsConstructor
public class BookController {

    private final BookService bookService;
    private final BookImportService bookImportService;
    private final BookCoverService bookCoverService;

    @GetMapping
    @PreAuthorize("hasAuthority('BOOK_READ')")
    public ResponseEntity<Page<BookResponse>> getAllBooks(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(defaultValue = "ALL") String stockStatus,
            @RequestParam(defaultValue = "ALL") String isbnStatus,
            @RequestParam(defaultValue = "ALL") String ebookStatus,
            @RequestParam(defaultValue = "ALL") String myBorrowStatus,
            @RequestParam(required = false) String publisher,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) Integer publicationYearFrom,
            @RequestParam(required = false) Integer publicationYearTo,
            @RequestParam(required = false) Integer minPageCount,
            @RequestParam(required = false) Integer maxPageCount,
            @RequestParam(defaultValue = "updatedAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(defaultValue = "0") int page,
            Principal principal) {

        String email = principal != null ? principal.getName() : null;

        if (!"ALL".equalsIgnoreCase(myBorrowStatus)
                && (email == null || email.isBlank())) {
            return ResponseEntity.status(401).build();
        }

        return ResponseEntity.ok(bookService.getAllBooks(
                keyword,
                categoryId,
                stockStatus,
                isbnStatus,
                ebookStatus,
                myBorrowStatus,
                sortBy,
                sortDir,
                page,
                email,
                publisher,
                language,
                publicationYearFrom,
                publicationYearTo,
                minPageCount,
                maxPageCount
        ));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('BOOK_READ')")
    public ResponseEntity<BookResponse> getBookById(
            @PathVariable Long id) {
        return ResponseEntity.ok(bookService.getBookById(id));
    }

    @GetMapping("/covers/{fileName:.+}")
    public ResponseEntity<Resource> getBookCover(
            @PathVariable String fileName) {

        Resource resource = bookCoverService.loadCover(fileName);

        return ResponseEntity.ok()
                .contentType(bookCoverService.getMediaType(fileName))
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                .body(resource);
    }

    @PostMapping(
            value = "/{id}/cover",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    @PreAuthorize("hasAnyAuthority('BOOK_CREATE', 'BOOK_UPDATE')")
    public ResponseEntity<BookResponse> uploadBookCover(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(bookCoverService.uploadCover(id, file));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('BOOK_CREATE')")
    public ResponseEntity<BookResponse> createBook(
            @Valid @RequestBody BookRequest request) {
        return ResponseEntity.ok(bookService.createBook(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('BOOK_UPDATE')")
    public ResponseEntity<BookResponse> updateBook(
            @PathVariable Long id,
            @Valid @RequestBody BookRequest request) {
        return ResponseEntity.ok(bookService.updateBook(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('BOOK_DELETE')")
    public ResponseEntity<String> deleteBook(
            @PathVariable Long id) {
        bookService.deleteBook(id);
        return ResponseEntity.ok("Xóa sách thành công");
    }

    @GetMapping("/trash")
    @PreAuthorize("hasAuthority('BOOK_READ')")
    public ResponseEntity<List<BookResponse>> getDeletedBooks() {
        return ResponseEntity.ok(bookService.getDeletedBooks());
    }

    @PutMapping("/{id}/restore")
    @PreAuthorize("hasAuthority('BOOK_UPDATE')")
    public ResponseEntity<BookResponse> restoreBook(
            @PathVariable Long id) {
        return ResponseEntity.ok(bookService.restoreBook(id));
    }

    @PostMapping(
            value = "/import",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    @PreAuthorize("hasAuthority('BOOK_IMPORT')")
    public ResponseEntity<?> importBooksFromCsv(
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(bookImportService.importBooksFromCsv(file));
    }

    // Danh sách sách đang có người mượn, chưa trả.
    @GetMapping("/combobox")
    @PreAuthorize("hasAuthority('BOOK_READ')")
    public ResponseEntity<List<BookComboboxResponse>> getBooksForCombobox() {

        List<BookComboboxResponse> list =
                bookService.getBooksWithActiveLoans()
                        .stream()
                        .map(book -> new BookComboboxResponse(
                                book.getId(),
                                book.getTitle(),
                                book.getIsbn()
                        ))
                        .toList();

        return ResponseEntity.ok(list);
    }

    // Tìm kiếm sách đang được mượn cho bộ lọc thành viên.
    @GetMapping("/borrowed-options")
    @PreAuthorize("hasAuthority('BOOK_READ')")
    public ResponseEntity<List<BookComboboxResponse>> searchBorrowedBooks(
            @RequestParam(required = false) String keyword) {

        return ResponseEntity.ok(
                bookService.searchBorrowedBooks(keyword)
        );
    }
}
