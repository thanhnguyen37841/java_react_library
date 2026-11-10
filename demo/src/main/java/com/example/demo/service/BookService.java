
package com.example.demo.service;

import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.dto.request.BookRequest;
import com.example.demo.dto.response.BookComboboxResponse;
import com.example.demo.dto.response.BookResponse;
import com.example.demo.entity.Book;
import com.example.demo.entity.Category;
import com.example.demo.entity.enums.BorrowStatus;
import com.example.demo.mapper.BookMapper;
import com.example.demo.repository.BookRepository;
import com.example.demo.repository.CategoryRepository;
import com.example.demo.repository.specification.BookSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class BookService {

    private final BookRepository bookRepository;
    private final CategoryRepository categoryRepository;
    private final BookMapper bookMapper;

    private static final int PAGE_SIZE = 10;
    private static final int BORROWED_BOOK_OPTION_LIMIT = 10;

    private static final List<BorrowStatus> ACTIVE_BORROW_STATUSES =
            List.of(
                    BorrowStatus.BORROWING,
                    BorrowStatus.OVERDUE
            );

    // Danh sách sách có lượt mượn đang mở.
    @Transactional(readOnly = true)
    public List<Book> getBooksWithActiveLoans() {
        return bookRepository.findBooksWithActiveLoans(
                ACTIVE_BORROW_STATUSES
        );
    }

    /*
     * Tìm sách đang có người mượn theo tên, tác giả hoặc ISBN.
     * Trả về danh sách rỗng nếu không tìm thấy.
     */
    @Transactional(readOnly = true)
    public List<BookComboboxResponse> searchBorrowedBooks(
            String keyword) {

        String normalizedKeyword = StringUtils.hasText(keyword)
                ? keyword.trim()
                : null;

        Pageable pageable = PageRequest.of(
                0,
                BORROWED_BOOK_OPTION_LIMIT,
                Sort.by(Sort.Direction.ASC, "title")
        );

        return bookRepository.searchBorrowedBooks(
                        normalizedKeyword,
                        ACTIVE_BORROW_STATUSES,
                        pageable
                )
                .stream()
                .map(book -> new BookComboboxResponse(
                        book.getId(),
                        book.getTitle(),
                        book.getIsbn()
                ))
                .toList();
    }

    private Sort buildSort(String sortBy, String sortDir) {
        String key = StringUtils.hasText(sortBy)
                ? sortBy.trim().toLowerCase(Locale.ROOT)
                : "updatedat";

        String directionValue = StringUtils.hasText(sortDir)
                ? sortDir.trim().toLowerCase(Locale.ROOT)
                : "desc";

        Sort.Direction direction = switch (directionValue) {
            case "asc" -> Sort.Direction.ASC;
            case "desc" -> Sort.Direction.DESC;
            default -> throw new IllegalArgumentException(
                    "Chiều sắp xếp chỉ được là asc hoặc desc."
            );
        };

        String property = switch (key) {
            case "title" -> "title";
            case "author" -> "author";
            case "totalquantity" -> "totalQuantity";
            case "availablequantity" -> "availableQuantity";
            case "createdat" -> "createdAt";
            case "updatedat" -> "updatedAt";
            case "publicationyear" -> "publicationYear";
            case "pagecount" -> "pageCount";
            default -> throw new IllegalArgumentException(
                    "Trường sắp xếp không được hỗ trợ: " + sortBy
            );
        };

        return Sort.by(direction, property)
                .and(Sort.by(Sort.Direction.DESC, "id"));
    }

    private String normalizeIsbn(String isbn) {
        if (isbn == null || isbn.isBlank()) {
            return null;
        }

        String normalized = isbn.trim()
                .replaceAll("[\\s-]", "")
                .toUpperCase(Locale.ROOT);

        return normalized.isEmpty() ? null : normalized;
    }

    private String normalizeOptionalText(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private void normalizeRequest(BookRequest request) {
        request.setIsbn(normalizeIsbn(request.getIsbn()));
        request.setEdition(normalizeOptionalText(request.getEdition()));
        request.setCoverImageUrl(
                normalizeOptionalText(request.getCoverImageUrl())
        );
        request.setDescription(
                normalizeOptionalText(request.getDescription())
        );
        request.setPublisher(
                normalizeOptionalText(request.getPublisher())
        );
        request.setLanguage(
                normalizeOptionalText(request.getLanguage())
        );
    }

    private void validateIsbnUnique(String isbn, Long excludeBookId) {
        String normalizedIsbn = normalizeIsbn(isbn);

        if (normalizedIsbn == null) {
            return;
        }

        boolean duplicated = bookRepository.findAllByIsbnIsNotNull()
                .stream()
                .filter(book -> excludeBookId == null
                        || !book.getId().equals(excludeBookId))
                .map(Book::getIsbn)
                .map(this::normalizeIsbn)
                .anyMatch(normalizedIsbn::equals);

        if (duplicated) {
            throw new IllegalArgumentException(
                    "ISBN " + normalizedIsbn
                            + " đã được sử dụng trong hệ thống, "
                            + "kể cả trong thùng rác. "
                            + "Hãy kiểm tra và khôi phục sách cũ "
                            + "thay vì tạo bản ghi trùng."
            );
        }
    }

    @Transactional(readOnly = true)
    public Page<BookResponse> getAllBooks(
            String keyword,
            Long categoryId,
            int page) {
        return getAllBooks(
                keyword, categoryId,
                "ALL", "ALL", "ALL", "ALL",
                "updatedAt", "desc", page, null
        );
    }

    @Transactional(readOnly = true)
    public Page<BookResponse> getAllBooks(
            String keyword,
            Long categoryId,
            String stockStatus,
            String isbnStatus,
            String sortBy,
            String sortDir,
            int page) {
        return getAllBooks(
                keyword, categoryId,
                stockStatus, isbnStatus, "ALL", "ALL",
                sortBy, sortDir, page, null
        );
    }

    @Transactional(readOnly = true)
    public Page<BookResponse> getAllBooks(
            String keyword,
            Long categoryId,
            String stockStatus,
            String isbnStatus,
            String ebookStatus,
            String myBorrowStatus,
            String sortBy,
            String sortDir,
            int page,
            String email) {
        return getAllBooks(
                keyword, categoryId,
                stockStatus, isbnStatus, ebookStatus, myBorrowStatus,
                sortBy, sortDir, page, email,
                null, null, null, null, null, null
        );
    }

    @Transactional(readOnly = true)
    public Page<BookResponse> getAllBooks(
            String keyword,
            Long categoryId,
            String stockStatus,
            String isbnStatus,
            String ebookStatus,
            String myBorrowStatus,
            String sortBy,
            String sortDir,
            int page,
            String email,
            String publisher,
            String language,
            Integer publicationYearFrom,
            Integer publicationYearTo,
            Integer minPageCount,
            Integer maxPageCount) {

        if (page < 0) {
            throw new IllegalArgumentException(
                    "Số trang không được nhỏ hơn 0."
            );
        }

        Pageable pageable = PageRequest.of(
                page,
                PAGE_SIZE,
                buildSort(sortBy, sortDir)
        );

        return bookRepository.findAll(
                BookSpecification.search(
                        keyword,
                        categoryId,
                        stockStatus,
                        isbnStatus,
                        ebookStatus,
                        myBorrowStatus,
                        email,
                        publisher,
                        language,
                        publicationYearFrom,
                        publicationYearTo,
                        minPageCount,
                        maxPageCount
                ),
                pageable
        ).map(bookMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public BookResponse getBookById(Long id) {
        Book book = bookRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Không tìm thấy sách")
                );

        return bookMapper.toResponse(book);
    }

    @Transactional
    public BookResponse createBook(BookRequest request) {
        normalizeRequest(request);
        validateIsbnUnique(request.getIsbn(), null);

        Category category = categoryRepository
                .findById(request.getCategoryId())
                .orElseThrow(() ->
                        new ResourceNotFoundException("Danh mục không tồn tại")
                );

        Book book = bookMapper.toEntity(request);
        book.setCategory(category);
        book.setDeleted(false);
        book.setDeletedAt(null);

        return bookMapper.toResponse(bookRepository.save(book));
    }

    @Transactional
    public BookResponse updateBook(Long id, BookRequest request) {
        Book book = bookRepository.findByIdForUpdate(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Không tìm thấy sách")
                );

        normalizeRequest(request);
        validateIsbnUnique(request.getIsbn(), id);

        Category category = categoryRepository
                .findById(request.getCategoryId())
                .orElseThrow(() ->
                        new ResourceNotFoundException("Danh mục không tồn tại")
                );

        int difference =
                request.getTotalQuantity() - book.getTotalQuantity();

        int newAvailableQuantity =
                book.getAvailableQuantity() + difference;

        if (newAvailableQuantity < 0) {
            throw new IllegalArgumentException(
                    "Số lượng tổng không hợp lệ "
                            + "(nhỏ hơn số sách đang cho mượn)."
            );
        }

        bookMapper.updateEntity(book, request);
        book.setCategory(category);
        book.setAvailableQuantity(newAvailableQuantity);

        return bookMapper.toResponse(bookRepository.save(book));
    }

    @Transactional
    public void deleteBook(Long id) {
        Book book = bookRepository.findByIdForUpdate(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Không tìm thấy sách")
                );

        if (book.getTotalQuantity() > book.getAvailableQuantity()) {
            throw new IllegalArgumentException(
                    "Không thể xóa sách đang có người mượn."
            );
        }

        book.setDeleted(true);
        book.setDeletedAt(LocalDateTime.now());

        bookRepository.save(book);
    }

    @Transactional(readOnly = true)
    public List<Book> getAllBooksWithoutPagination() {
        return bookRepository.findAllByDeletedFalse();
    }

    @Transactional(readOnly = true)
    public List<BookResponse> getDeletedBooks() {
        return bookRepository.findAllByDeletedTrue()
                .stream()
                .map(bookMapper::toResponse)
                .toList();
    }

    @Transactional
    public BookResponse restoreBook(Long id) {
        Book book = bookRepository.findDeletedByIdForUpdate(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Không tìm thấy sách trong thùng rác"
                        )
                );

        validateIsbnUnique(book.getIsbn(), book.getId());

        book.setDeleted(false);
        book.setDeletedAt(null);

        return bookMapper.toResponse(bookRepository.save(book));
    }
}
