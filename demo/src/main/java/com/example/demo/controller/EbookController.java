package com.example.demo.controller;

import com.example.demo.dto.response.BookResponse;
import com.example.demo.service.BorrowService;
import com.example.demo.service.EbookService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.List;

@RestController
@RequestMapping("/api/ebooks")
@RequiredArgsConstructor
public class EbookController {

    private final EbookService ebookService;
    private final BorrowService borrowService;

    @GetMapping
    @PreAuthorize("hasAuthority('BOOK_READ')")
    public ResponseEntity<List<BookResponse>> listEbooks() {
        return ResponseEntity.ok(ebookService.listEbooks());
    }

    @PostMapping(value = "/books/{bookId}/file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('BOOK_UPDATE')")
    public ResponseEntity<BookResponse> uploadPdf(
            @PathVariable Long bookId,
            @RequestParam("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(ebookService.uploadPdf(bookId, file));
    }

    @GetMapping(value = "/books/{bookId}/content", produces = MediaType.APPLICATION_PDF_VALUE)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<FileSystemResource> readPdf(
            @PathVariable Long bookId, Authentication authentication) {
        Path file = ebookService.getAuthorizedPdfPath(
                authentication.getName(), bookId, borrowService);
        FileSystemResource resource = new FileSystemResource(file);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(file.toFile().length())
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline()
                                .filename("ebook-" + bookId + ".pdf", StandardCharsets.UTF_8)
                                .build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .body(resource);
    }
}