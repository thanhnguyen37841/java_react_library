
package com.example.demo.service;

import com.example.demo.dto.response.ImportResultResponse;
import com.example.demo.entity.Book;
import com.example.demo.entity.Category;
import com.example.demo.repository.BookRepository;
import com.example.demo.repository.CategoryRepository;
import com.opencsv.CSVReader;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookImportService {

    private static final long MAX_FILE_SIZE = 5L * 1024 * 1024;

    private static final int MAX_TITLE_LENGTH = 255;
    private static final int MAX_AUTHOR_LENGTH = 255;
    private static final int MAX_ISBN_LENGTH = 20;
    private static final int MAX_EDITION_LENGTH = 100;
    private static final int MAX_COVER_URL_LENGTH = 1000;
    private static final int MAX_PUBLISHER_LENGTH = 255;
    private static final int MAX_LANGUAGE_LENGTH = 100;

    private static final Map<String, String> HEADER_LABELS = Map.ofEntries(
            Map.entry("title", "Title"),
            Map.entry("author", "Author"),
            Map.entry("totalquantity", "TotalQuantity"),
            Map.entry("categoryid", "CategoryId"),
            Map.entry("isbn", "ISBN"),
            Map.entry("edition", "Edition"),
            Map.entry("coverimageurl", "CoverImageUrl"),
            Map.entry("description", "Description"),
            Map.entry("publisher", "Publisher"),
            Map.entry("publicationyear", "PublicationYear"),
            Map.entry("language", "Language"),
            Map.entry("pagecount", "PageCount")
    );

    private static final List<String> REQUIRED_HEADERS = List.of(
            "title",
            "author",
            "totalquantity",
            "categoryid"
    );

    private final BookRepository bookRepository;
    private final CategoryRepository categoryRepository;
    private final PlatformTransactionManager transactionManager;

    public ImportResultResponse importBooksFromCsv(
            MultipartFile file) {

        validateFile(file);

        List<String> errors = new ArrayList<>();
        int success = 0;
        int failed = 0;

        Set<String> existingIsbns = new HashSet<>();
        Set<String> deletedIsbns = new HashSet<>();
        Set<String> importedIsbns = new HashSet<>();

        /*
         * Lấy ISBN của cả sách hoạt động và sách trong thùng rác.
         */
        bookRepository.findAllByIsbnIsNotNull().forEach(book -> {
            String isbn = normalizeIsbn(book.getIsbn());

            if (isbn == null) {
                return;
            }

            if (book.isDeleted()) {
                deletedIsbns.add(isbn);
            } else {
                existingIsbns.add(isbn);
            }
        });

        try (CSVReader reader = new CSVReader(
                new InputStreamReader(
                        file.getInputStream(),
                        StandardCharsets.UTF_8
                )
        )) {
            String[] headerRow = reader.readNext();

            if (headerRow == null || headerRow.length == 0) {
                throw new IllegalArgumentException(
                        "File CSV không có header."
                );
            }

            Map<String, Integer> headers =
                    buildHeaderMap(headerRow);

            validateHeaders(headers);

            String[] data;
            int lineNumber = 1;
            int dataRowCount = 0;

            while ((data = reader.readNext()) != null) {
                lineNumber++;

                if (isEmptyRow(data)) {
                    continue;
                }

                dataRowCount++;

                try {
                    Book book = parseRow(
                            data,
                            headers,
                            existingIsbns,
                            deletedIsbns,
                            importedIsbns
                    );

                    saveInIndependentTransaction(book);

                    /*
                     * Chỉ ghi nhận ISBN sau khi transaction lưu thành công.
                     */
                    String isbn = normalizeIsbn(book.getIsbn());

                    if (isbn != null) {
                        importedIsbns.add(isbn);
                    }

                    success++;

                } catch (Exception e) {
                    failed++;

                    String message = e.getMessage() == null
                            ? "Dữ liệu không hợp lệ hoặc không thể lưu sách."
                            : e.getMessage();

                    errors.add(
                            "Dòng " + lineNumber + ": " + message
                    );

                    log.warn(
                            "Không thể import sách tại dòng {}: {}",
                            lineNumber,
                            message
                    );
                }
            }

            if (dataRowCount == 0) {
                throw new IllegalArgumentException(
                        "File CSV chỉ có header, "
                        + "không có dòng dữ liệu sách."
                );
            }

        } catch (IllegalArgumentException e) {
            throw e;

        } catch (Exception e) {
            log.error("Lỗi đọc hoặc xử lý file CSV", e);

            throw new RuntimeException(
                    "Không thể đọc hoặc xử lý file CSV.",
                    e
            );
        }

        return new ImportResultResponse(
                success,
                failed,
                errors
        );
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException(
                    "Vui lòng chọn file CSV."
            );
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException(
                    "File vượt quá dung lượng cho phép (5MB)."
            );
        }

        String filename = file.getOriginalFilename();

        if (filename == null
                || !filename.toLowerCase(Locale.ROOT).endsWith(".csv")) {
            throw new IllegalArgumentException(
                    "Chỉ chấp nhận định dạng file .csv."
            );
        }
    }

    private Map<String, Integer> buildHeaderMap(
            String[] headerRow) {

        Map<String, Integer> headers = new HashMap<>();

        for (int i = 0; i < headerRow.length; i++) {
            String header = normalizeHeader(headerRow[i]);

            if (header.isEmpty()) {
                continue;
            }

            if (headers.putIfAbsent(header, i) != null) {
                throw new IllegalArgumentException(
                        "Header CSV bị trùng: " + headerRow[i]
                );
            }
        }

        return headers;
    }

    private String normalizeHeader(String value) {
        if (value == null) {
            return "";
        }

        return value.replace("\uFEFF", "")
                .trim()
                .replaceAll("[\\s_-]+", "")
                .toLowerCase(Locale.ROOT);
    }

    private void validateHeaders(
            Map<String, Integer> headers) {

        List<String> missing = REQUIRED_HEADERS.stream()
                .filter(header -> !headers.containsKey(header))
                .map(header ->
                        HEADER_LABELS.getOrDefault(header, header))
                .toList();

        if (!missing.isEmpty()) {
            throw new IllegalArgumentException(
                    "CSV thiếu cột bắt buộc: "
                    + String.join(", ", missing)
                    + ". Các cột bắt buộc: "
                    + "Title, Author, TotalQuantity, CategoryId."
            );
        }
    }

    private Book parseRow(
            String[] data,
            Map<String, Integer> headers,
            Set<String> existingIsbns,
            Set<String> deletedIsbns,
            Set<String> importedIsbns) {

        String title = getColumn(data, headers, "title");
        String author = getColumn(data, headers, "author");
        String quantityText =
                getColumn(data, headers, "totalquantity");
        String categoryIdText =
                getColumn(data, headers, "categoryid");

        String isbn = normalizeIsbn(
                getColumn(data, headers, "isbn")
        );

        String edition = getColumn(data, headers, "edition");
        String coverImageUrl =
                getColumn(data, headers, "coverimageurl");
        String description = getColumn(data, headers, "description");
        String publisher = getColumn(data, headers, "publisher");
        String publicationYearText =
                getColumn(data, headers, "publicationyear");
        String language = getColumn(data, headers, "language");
        String pageCountText = getColumn(data, headers, "pagecount");

        if (title.isEmpty()) {
            throw new IllegalArgumentException(
                    "Title không được để trống."
            );
        }

        if (title.length() > MAX_TITLE_LENGTH) {
            throw new IllegalArgumentException(
                    "Title không được vượt quá 255 ký tự."
            );
        }

        if (author.isEmpty()) {
            throw new IllegalArgumentException(
                    "Author không được để trống."
            );
        }

        if (author.length() > MAX_AUTHOR_LENGTH) {
            throw new IllegalArgumentException(
                    "Author không được vượt quá 255 ký tự."
            );
        }

        int quantity;

        try {
            quantity = Integer.parseInt(quantityText);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(
                    "TotalQuantity phải là số nguyên hợp lệ."
            );
        }

        if (quantity < 1) {
            throw new IllegalArgumentException(
                    "TotalQuantity phải lớn hơn 0."
            );
        }

        long categoryId;

        try {
            categoryId = Long.parseLong(categoryIdText);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(
                    "CategoryId phải là số nguyên hợp lệ."
            );
        }

        if (categoryId < 1) {
            throw new IllegalArgumentException(
                    "CategoryId phải lớn hơn 0."
            );
        }

        if (isbn != null && isbn.length() > MAX_ISBN_LENGTH) {
            throw new IllegalArgumentException(
                    "ISBN không được vượt quá 20 ký tự sau chuẩn hóa."
            );
        }

        if (edition.length() > MAX_EDITION_LENGTH) {
            throw new IllegalArgumentException(
                    "Edition không được vượt quá 100 ký tự."
            );
        }

        if (coverImageUrl.length() > MAX_COVER_URL_LENGTH) {
            throw new IllegalArgumentException(
                    "CoverImageUrl không được vượt quá 1000 ký tự."
            );
        }

        if (publisher.length() > MAX_PUBLISHER_LENGTH) {
            throw new IllegalArgumentException(
                    "Publisher không được vượt quá 255 ký tự."
            );
        }

        if (language.length() > MAX_LANGUAGE_LENGTH) {
            throw new IllegalArgumentException(
                    "Language không được vượt quá 100 ký tự."
            );
        }

        Integer publicationYear = parseOptionalPositiveInteger(
                publicationYearText, "PublicationYear", true
        );
        Integer pageCount = parseOptionalPositiveInteger(
                pageCountText, "PageCount", false
        );

        if (isbn != null) {
            if (existingIsbns.contains(isbn)) {
                throw new IllegalArgumentException(
                        "ISBN đã tồn tại trong danh sách sách "
                        + "đang hoạt động: " + isbn
                );
            }

            if (deletedIsbns.contains(isbn)) {
                throw new IllegalArgumentException(
                        "ISBN " + isbn
                        + " thuộc sách đã xóa mềm. "
                        + "Vui lòng khôi phục sách trong thùng rác "
                        + "thay vì import thành sách mới."
                );
            }

            if (importedIsbns.contains(isbn)) {
                throw new IllegalArgumentException(
                        "ISBN bị trùng trong file CSV: " + isbn
                );
            }
        }

        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Không tìm thấy ID danh mục: "
                                + categoryId
                        )
                );

        Book book = new Book();
        book.setTitle(title);
        book.setAuthor(author);
        book.setIsbn(isbn);
        book.setEdition(
                edition.isEmpty() ? null : edition
        );
        book.setCoverImageUrl(
                coverImageUrl.isEmpty() ? null : coverImageUrl
        );
        book.setDescription(description.isEmpty() ? null : description);
        book.setPublisher(publisher.isEmpty() ? null : publisher);
        book.setPublicationYear(publicationYear);
        book.setLanguage(language.isEmpty() ? null : language);
        book.setPageCount(pageCount);
        book.setTotalQuantity(quantity);
        book.setAvailableQuantity(quantity);
        book.setCategory(category);
        book.setDeleted(false);
        book.setDeletedAt(null);

        return book;
    }


    private Integer parseOptionalPositiveInteger(
            String value,
            String columnName,
            boolean allowZero) {

        if (value == null || value.isBlank()) {
            return null;
        }

        final int parsed;
        try {
            parsed = Integer.parseInt(value.trim());
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(
                    columnName + " phải là số nguyên hợp lệ."
            );
        }

        if (allowZero ? parsed < 0 : parsed < 1) {
            throw new IllegalArgumentException(
                    allowZero
                            ? columnName + " không được nhỏ hơn 0."
                            : columnName + " phải lớn hơn 0."
            );
        }

        if ("PublicationYear".equals(columnName)
                && parsed > java.time.Year.now().getValue() + 1) {
            throw new IllegalArgumentException(
                    "PublicationYear không được ở tương lai quá 1 năm."
            );
        }

        return parsed;
    }

    private void saveInIndependentTransaction(Book book) {
        TransactionTemplate transactionTemplate =
                new TransactionTemplate(transactionManager);

        transactionTemplate.setPropagationBehavior(
                TransactionDefinition.PROPAGATION_REQUIRES_NEW
        );

        transactionTemplate.executeWithoutResult(status ->
                bookRepository.saveAndFlush(book)
        );
    }

    private String getColumn(
            String[] data,
            Map<String, Integer> headers,
            String columnName) {

        Integer index = headers.get(columnName);

        if (index == null || index < 0 || index >= data.length) {
            return "";
        }

        String value = data[index];

        if (value == null) {
            return "";
        }

        return value.replace("\uFEFF", "").trim();
    }

    private boolean isEmptyRow(String[] data) {
        if (data == null || data.length == 0) {
            return true;
        }

        for (String value : data) {
            if (value != null && !value.trim().isEmpty()) {
                return false;
            }
        }

        return true;
    }

    private static String normalizeIsbn(String isbn) {
        if (isbn == null || isbn.isBlank()) {
            return null;
        }

        String normalized = isbn.trim()
                .replaceAll("[\\s-]", "")
                .toUpperCase(Locale.ROOT);

        return normalized.isEmpty() ? null : normalized;
    }
}
