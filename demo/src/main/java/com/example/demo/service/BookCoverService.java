package com.example.demo.service;

import com.example.demo.dto.response.BookResponse;
import com.example.demo.entity.Book;
import com.example.demo.mapper.BookMapper;
import com.example.demo.repository.BookRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BookCoverService {

    private static final long MAX_FILE_SIZE = 10L * 1024L * 1024L;
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "jpg", "jpeg", "png", "webp", "gif", "bmp", "svg", "avif"
    );

    private static final Map<String, MediaType> MEDIA_TYPES = Map.of(
            "jpg", MediaType.IMAGE_JPEG,
            "jpeg", MediaType.IMAGE_JPEG,
            "png", MediaType.IMAGE_PNG,
            "webp", MediaType.parseMediaType("image/webp"),
            "gif", MediaType.IMAGE_GIF,
            "bmp", MediaType.parseMediaType("image/bmp"),
            "svg", MediaType.parseMediaType("image/svg+xml"),
            "avif", MediaType.parseMediaType("image/avif")
    );

    private final BookRepository bookRepository;
    private final BookMapper bookMapper;

    @Value("${library.book-cover.storage-dir:./data/book-covers}")
    private String storageDirectory;

    @Value("${library.book-cover.public-base-url:http://localhost:8080}")
    private String publicBaseUrl;

    @Transactional
    public BookResponse uploadCover(Long bookId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Vui lòng chọn file ảnh bìa.");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("Ảnh bìa không được vượt quá 10 MB.");
        }

        String originalName = StringUtils.cleanPath(
                file.getOriginalFilename() == null ? "cover" : file.getOriginalFilename()
        );
        String extension = getExtension(originalName);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException(
                    "Định dạng ảnh không được hỗ trợ. Chỉ nhận JPG, JPEG, PNG, WEBP, GIF, BMP, SVG hoặc AVIF."
            );
        }

        String contentType = file.getContentType();
        if (StringUtils.hasText(contentType)
                && !contentType.toLowerCase(Locale.ROOT).startsWith("image/")) {
            throw new IllegalArgumentException("File tải lên không được nhận diện là ảnh.");
        }

        Book book = bookRepository.findByIdAndDeletedFalse(bookId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sách đang hoạt động."));

        String fileName = UUID.randomUUID() + "." + extension;
        Path root = Path.of(storageDirectory).toAbsolutePath().normalize();
        Path target = root.resolve(fileName).normalize();
        if (!target.startsWith(root)) {
            throw new IllegalArgumentException("Đường dẫn lưu ảnh không hợp lệ.");
        }

        try {
            Files.createDirectories(root);
            try (InputStream input = file.getInputStream()) {
                Files.copy(input, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException exception) {
            throw new RuntimeException("Không thể lưu ảnh bìa lên máy chủ.", exception);
        }

        String previousCoverUrl = book.getCoverImageUrl();
        String baseUrl = publicBaseUrl == null ? "" : publicBaseUrl.trim();
        while (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        }
        book.setCoverImageUrl(baseUrl + "/api/books/covers/" + fileName);
        try {
            Book saved = bookRepository.save(book);
            return bookMapper.toResponse(saved);
        } catch (RuntimeException exception) {
            try {
                Files.deleteIfExists(target);
            } catch (IOException ignored) {
                // Không che mất lỗi lưu dữ liệu gốc.
            }
            book.setCoverImageUrl(previousCoverUrl);
            throw exception;
        }
    }

    public Resource loadCover(String fileName) {
        if (!StringUtils.hasText(fileName) || fileName.contains("/") || fileName.contains("\\")
                || fileName.contains("..")) {
            throw new IllegalArgumentException("Tên file ảnh không hợp lệ.");
        }

        Path root = Path.of(storageDirectory).toAbsolutePath().normalize();
        Path file = root.resolve(fileName).normalize();
        if (!file.startsWith(root) || !Files.isRegularFile(file)) {
            throw new IllegalArgumentException("Không tìm thấy ảnh bìa.");
        }
        return new FileSystemResource(file);
    }

    public MediaType getMediaType(String fileName) {
        String extension = getExtension(fileName);
        return MEDIA_TYPES.getOrDefault(extension, MediaType.APPLICATION_OCTET_STREAM);
    }

    private String getExtension(String fileName) {
        int dot = fileName.lastIndexOf('.');
        if (dot < 0 || dot == fileName.length() - 1) {
            return "";
        }
        return fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
    }
}
