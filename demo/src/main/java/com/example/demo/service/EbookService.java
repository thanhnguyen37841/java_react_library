package com.example.demo.service;

import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.dto.response.BookResponse;
import com.example.demo.entity.Book;
import com.example.demo.repository.BookRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EbookService {

    private static final long MAX_PDF_SIZE = 30L * 1024 * 1024;

    private final BookRepository bookRepository;

    @Value("${library.ebook.storage-dir:./data/ebooks}")
    private String storageDirectory;

    @Transactional(readOnly = true)
    public List<BookResponse> listEbooks() {
        return bookRepository.findAllByDeletedFalse().stream()
                .filter(book -> book.getEbookFilePath() != null
                        && !book.getEbookFilePath().isBlank())
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public BookResponse uploadPdf(Long bookId, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Vui lòng chọn tệp PDF.");
        }
        if (file.getSize() > MAX_PDF_SIZE) {
            throw new IllegalArgumentException("Dung lượng PDF tối đa là 30 MB.");
        }
        String contentType = file.getContentType();
        if (contentType != null && !contentType.equalsIgnoreCase("application/pdf")
                && !contentType.equalsIgnoreCase("application/octet-stream")) {
            throw new IllegalArgumentException("Chỉ chấp nhận tệp PDF.");
        }
        byte[] header = new byte[4];
        try (var input = file.getInputStream()) {
            if (input.read(header) != 4 || header[0] != '%'
                    || header[1] != 'P' || header[2] != 'D' || header[3] != 'F') {
                throw new IllegalArgumentException("Tệp được chọn không có định dạng PDF hợp lệ.");
            }
        }

        Book book = bookRepository.findByIdAndDeletedFalse(bookId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sách."));
        Path root = getStorageRoot();
        Files.createDirectories(root);
        Path target = root.resolve(UUID.randomUUID() + ".pdf").normalize();
        if (!target.startsWith(root)) {
            throw new RuntimeException("Đường dẫn lưu tệp không hợp lệ.");
        }
        file.transferTo(target);
        String previousPath = book.getEbookFilePath();
        book.setEbookFilePath(target.toAbsolutePath().toString());
        bookRepository.save(book);

        if (previousPath != null && !previousPath.isBlank()) {
            try {
                Path previous = Path.of(previousPath).toAbsolutePath().normalize();
                if (previous.startsWith(root) && !previous.equals(target)) {
                    Files.deleteIfExists(previous);
                }
            } catch (Exception ignored) {
                // Không làm hỏng thao tác cập nhật metadata nếu dọn tệp cũ thất bại.
            }
        }
        return toResponse(book);
    }

    @Transactional(readOnly = true)
    public Path getAuthorizedPdfPath(String email, Long bookId, BorrowService borrowService) {
        String storedPath = borrowService.getAuthorizedEbookPath(email, bookId);
        Path root = getStorageRoot();
        Path file = Path.of(storedPath).toAbsolutePath().normalize();
        if (!file.startsWith(root) || !Files.isRegularFile(file)) {
            throw new ResourceNotFoundException("Không tìm thấy tệp PDF trên máy chủ.");
        }
        return file;
    }

    private Path getStorageRoot() {
        return Path.of(storageDirectory).toAbsolutePath().normalize();
    }

    private BookResponse toResponse(Book book) {
        BookResponse response = new BookResponse();
        response.setId(book.getId());
        response.setTitle(book.getTitle());
        response.setAuthor(book.getAuthor());
        response.setIsbn(book.getIsbn());
        response.setEdition(book.getEdition());
        response.setTotalQuantity(book.getTotalQuantity());
        response.setAvailableQuantity(book.getAvailableQuantity());
        response.setCategoryId(book.getCategory() == null ? null : book.getCategory().getId());
        response.setCategoryName(book.getCategory() == null ? null : book.getCategory().getName());
        response.setCoverImageUrl(book.getCoverImageUrl());
        response.setHasEbook(book.getEbookFilePath() != null && !book.getEbookFilePath().isBlank());
        return response;
    }
}