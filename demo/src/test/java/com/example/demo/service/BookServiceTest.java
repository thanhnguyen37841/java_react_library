
package com.example.demo.service;

import com.example.demo.dto.request.BookRequest;
import com.example.demo.dto.response.BookResponse;
import com.example.demo.entity.Book;
import com.example.demo.entity.Category;
import com.example.demo.mapper.BookMapper;
import com.example.demo.repository.BookRepository;
import com.example.demo.repository.CategoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookServiceTest {

    @Mock
    private BookRepository bookRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private BookMapper bookMapper;

    @InjectMocks
    private BookService bookService;

    private Book book;
    private Category category;
    private BookRequest request;
    private BookResponse response;

    @BeforeEach
    void setUp() {
        category = new Category();
        category.setId(1L);
        category.setName("Lập trình");

        book = new Book();
        book.setId(100L);
        book.setTitle("Clean Code");
        book.setAuthor("Robert C. Martin");
        book.setTotalQuantity(5);
        book.setAvailableQuantity(5);
        book.setCategory(category);
        book.setDeleted(false);

        request = new BookRequest();
        request.setTitle("Clean Code");
        request.setAuthor("Robert C. Martin");
        request.setTotalQuantity(5);
        request.setCategoryId(1L);

        response = new BookResponse();
        response.setId(100L);
        response.setTitle("Clean Code");
        response.setAuthor("Robert C. Martin");
        response.setTotalQuantity(5);
        response.setAvailableQuantity(5);
        response.setCategoryName("Lập trình");
    }

    // =========================================================
    // GET ALL BOOKS
    // =========================================================

    @Test
    void getAllBooks_Success() {
        Page<Book> page = new PageImpl<>(
                List.of(book),
                PageRequest.of(0, 10),
                1
        );

        when(bookRepository.findAll(
                ArgumentMatchers.<Specification<Book>>any(),
                any(Pageable.class)
        )).thenReturn(page);

        when(bookMapper.toResponse(book)).thenReturn(response);

        Page<BookResponse> result =
                bookService.getAllBooks("Clean", 1L, 0);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals(1, result.getContent().size());
        assertEquals("Clean Code", result.getContent().get(0).getTitle());

        verify(bookRepository).findAll(
                ArgumentMatchers.<Specification<Book>>any(),
                any(Pageable.class)
        );

        verify(bookMapper).toResponse(book);
    }

    @Test
    void getAllBooks_EmptyResult() {
        Page<Book> emptyPage = new PageImpl<>(
                List.of(),
                PageRequest.of(0, 10),
                0
        );

        when(bookRepository.findAll(
                ArgumentMatchers.<Specification<Book>>any(),
                any(Pageable.class)
        )).thenReturn(emptyPage);

        Page<BookResponse> result =
                bookService.getAllBooks(null, null, 0);

        assertNotNull(result);
        assertTrue(result.getContent().isEmpty());
        assertEquals(0, result.getTotalElements());

        verify(bookRepository).findAll(
                ArgumentMatchers.<Specification<Book>>any(),
                any(Pageable.class)
        );

        verify(bookMapper, never()).toResponse(any(Book.class));
    }

    @Test
    void getAllBooks_NegativePage_ThrowsException() {
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> bookService.getAllBooks(null, null, -1)
        );

        assertEquals(
                "Số trang không được nhỏ hơn 0.",
                ex.getMessage()
        );

        verifyNoInteractions(bookRepository);
    }

    // =========================================================
    // GET BOOK BY ID
    // =========================================================

    @Test
    void getBookById_Success() {
        when(bookRepository.findByIdAndDeletedFalse(100L))
                .thenReturn(Optional.of(book));

        when(bookMapper.toResponse(book))
                .thenReturn(response);

        BookResponse result = bookService.getBookById(100L);

        assertNotNull(result);
        assertEquals(100L, result.getId());
        assertEquals("Clean Code", result.getTitle());

        verify(bookRepository).findByIdAndDeletedFalse(100L);
        verify(bookMapper).toResponse(book);
    }

    
        @Test
        void getBookById_NotFound() {

        when(bookRepository.findByIdAndDeletedFalse(999L))
                .thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(
                RuntimeException.class,
                () -> bookService.getBookById(999L)
        );

        assertEquals("Không tìm thấy sách", ex.getMessage());

        verify(bookRepository).findByIdAndDeletedFalse(999L);

        verify(bookMapper, never()).toResponse(any(Book.class));
        }


    // =========================================================
    // CREATE BOOK
    // =========================================================

    @Test
    void createBook_Success() {
        // Đã bỏ stub kiểm tra ISBN vì request chưa có ISBN.

        when(categoryRepository.findById(1L))
                .thenReturn(Optional.of(category));

        when(bookMapper.toEntity(request))
                .thenReturn(book);

        when(bookRepository.save(book))
                .thenReturn(book);

        when(bookMapper.toResponse(book))
                .thenReturn(response);

        BookResponse result = bookService.createBook(request);

        assertNotNull(result);
        assertEquals(100L, result.getId());
        assertSame(category, book.getCategory());
        assertFalse(book.isDeleted());
        assertNull(book.getDeletedAt());

        verify(categoryRepository).findById(1L);
        verify(bookRepository).save(book);
        verify(bookMapper).toResponse(book);
    }

    @Test
    void createBook_CategoryNotFound() {
        request.setCategoryId(999L);

        when(categoryRepository.findById(999L))
                .thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(
                RuntimeException.class,
                () -> bookService.createBook(request)
        );

        assertEquals("Danh mục không tồn tại", ex.getMessage());

        verify(bookRepository, never()).save(any(Book.class));
    }

    @Test
    void createBook_DuplicateIsbn_ThrowsException() {
        request.setIsbn("978-1-234567-89-0");

        Book duplicate = new Book();
        duplicate.setId(200L);
        duplicate.setIsbn("9781234567890");
        when(bookRepository.findAllByIsbnIsNotNull())
                .thenReturn(List.of(duplicate));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> bookService.createBook(request)
        );

        assertTrue(ex.getMessage().contains("đã được sử dụng"));

        verify(categoryRepository, never()).findById(anyLong());
        verify(bookRepository, never()).save(any(Book.class));
    }

    // =========================================================
    // UPDATE BOOK
    // =========================================================

    @Test
    void updateBook_Success() {
        when(bookRepository.findByIdForUpdate(100L))
                .thenReturn(Optional.of(book));

        when(categoryRepository.findById(1L))
                .thenReturn(Optional.of(category));

        when(bookRepository.save(book))
                .thenReturn(book);

        when(bookMapper.toResponse(book))
                .thenReturn(response);

        request.setTotalQuantity(7);

        BookResponse result = bookService.updateBook(100L, request);

        assertNotNull(result);
        assertEquals(7, book.getAvailableQuantity());

        verify(bookRepository).findByIdForUpdate(100L);
        verify(categoryRepository).findById(1L);
        verify(bookMapper).updateEntity(book, request);
        verify(bookRepository).save(book);
        verify(bookMapper).toResponse(book);
    }

    @Test
    void updateBook_BookNotFound() {
        when(bookRepository.findByIdForUpdate(999L))
                .thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(
                RuntimeException.class,
                () -> bookService.updateBook(999L, request)
        );

        assertEquals("Không tìm thấy sách", ex.getMessage());

        verify(categoryRepository, never()).findById(anyLong());
        verify(bookRepository, never()).save(any(Book.class));
        verify(bookMapper, never()).updateEntity(
                any(Book.class),
                any(BookRequest.class)
        );
    }

    @Test
    void updateBook_CategoryNotFound() {
        request.setCategoryId(999L);

        when(bookRepository.findByIdForUpdate(100L))
                .thenReturn(Optional.of(book));

        // Đã bỏ stub kiểm tra ISBN vì request chưa có ISBN.

        when(categoryRepository.findById(999L))
                .thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(
                RuntimeException.class,
                () -> bookService.updateBook(100L, request)
        );

        assertEquals("Danh mục không tồn tại", ex.getMessage());

        verify(bookRepository).findByIdForUpdate(100L);
        verify(categoryRepository).findById(999L);
        verify(bookRepository, never()).save(any(Book.class));
    }

    @Test
    void updateBook_InvalidTotalQuantity() {
        book.setTotalQuantity(5);
        book.setAvailableQuantity(2);
        request.setTotalQuantity(2);

        when(bookRepository.findByIdForUpdate(100L))
                .thenReturn(Optional.of(book));

        when(categoryRepository.findById(1L))
                .thenReturn(Optional.of(category));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> bookService.updateBook(100L, request)
        );

        assertEquals(
                "Số lượng tổng không hợp lệ (nhỏ hơn số sách đang cho mượn).",
                ex.getMessage()
        );

        verify(bookRepository, never()).save(any(Book.class));
        verify(bookMapper, never()).updateEntity(
                any(Book.class),
                any(BookRequest.class)
        );
    }

    @Test
    void updateBook_DuplicateIsbn_ThrowsException() {
        request.setIsbn("978-1-234567-89-0");

        when(bookRepository.findByIdForUpdate(100L))
                .thenReturn(Optional.of(book));
        Book duplicate = new Book();
        duplicate.setId(200L);
        duplicate.setIsbn("9781234567890");
        when(bookRepository.findAllByIsbnIsNotNull())
                .thenReturn(List.of(duplicate));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> bookService.updateBook(100L, request)
        );

        assertTrue(ex.getMessage().contains("đã được sử dụng"));

        verify(categoryRepository, never()).findById(anyLong());
        verify(bookRepository, never()).save(any(Book.class));
    }

    // =========================================================
    // SOFT DELETE BOOK
    // =========================================================

    @Test
    void deleteBook_Success() {
        when(bookRepository.findByIdForUpdate(100L))
                .thenReturn(Optional.of(book));

        when(bookRepository.save(book))
                .thenReturn(book);

        bookService.deleteBook(100L);

        assertTrue(book.isDeleted());
        assertNotNull(book.getDeletedAt());

        verify(bookRepository).findByIdForUpdate(100L);
        verify(bookRepository).save(book);
        verify(bookRepository, never()).delete(any(Book.class));
    }

    @Test
    void deleteBook_NotFound() {
        when(bookRepository.findByIdForUpdate(999L))
                .thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(
                RuntimeException.class,
                () -> bookService.deleteBook(999L)
        );

        assertEquals("Không tìm thấy sách", ex.getMessage());

        verify(bookRepository).findByIdForUpdate(999L);
        verify(bookRepository, never()).save(any(Book.class));
        verify(bookRepository, never()).delete(any(Book.class));
    }

    @Test
    void deleteBook_BookBeingBorrowed() {
        book.setTotalQuantity(5);
        book.setAvailableQuantity(4);

        when(bookRepository.findByIdForUpdate(100L))
                .thenReturn(Optional.of(book));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> bookService.deleteBook(100L)
        );

        assertEquals(
                "Không thể xóa sách đang có người mượn.",
                ex.getMessage()
        );

        assertFalse(book.isDeleted());

        verify(bookRepository).findByIdForUpdate(100L);
        verify(bookRepository, never()).save(any(Book.class));
        verify(bookRepository, never()).delete(any(Book.class));
    }

    // =========================================================
    // GET ALL BOOKS WITHOUT PAGINATION
    // =========================================================

    @Test
    void getAllBooksWithoutPagination_Success() {
        when(bookRepository.findAllByDeletedFalse())
                .thenReturn(List.of(book));

        List<Book> result =
                bookService.getAllBooksWithoutPagination();

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(100L, result.get(0).getId());

        verify(bookRepository).findAllByDeletedFalse();
        verify(bookRepository, never()).findAll();
    }

    @Test
    void getAllBooksWithoutPagination_EmptyResult() {
        when(bookRepository.findAllByDeletedFalse())
                .thenReturn(List.of());

        List<Book> result =
                bookService.getAllBooksWithoutPagination();

        assertNotNull(result);
        assertTrue(result.isEmpty());

        verify(bookRepository).findAllByDeletedFalse();
    }

    // =========================================================
    // RESTORE DELETED BOOK
    // =========================================================

    @Test
    void restoreBook_Success() {
        book.setDeleted(true);

        when(bookRepository.findDeletedByIdForUpdate(100L))
                .thenReturn(Optional.of(book));

        when(bookRepository.save(book))
                .thenReturn(book);

        when(bookMapper.toResponse(book))
                .thenReturn(response);

        BookResponse result = bookService.restoreBook(100L);

        assertNotNull(result);
        assertFalse(book.isDeleted());
        assertNull(book.getDeletedAt());

        verify(bookRepository).findDeletedByIdForUpdate(100L);
        verify(bookRepository).save(book);
        verify(bookMapper).toResponse(book);
    }

    @Test
    void restoreBook_NotFound() {
        when(bookRepository.findDeletedByIdForUpdate(999L))
                .thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(
                RuntimeException.class,
                () -> bookService.restoreBook(999L)
        );

        assertEquals(
                "Không tìm thấy sách trong thùng rác",
                ex.getMessage()
        );

        verify(bookRepository, never()).save(any(Book.class));
    }
}
