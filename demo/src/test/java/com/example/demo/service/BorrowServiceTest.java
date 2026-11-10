
package com.example.demo.service;

import com.example.demo.dto.request.BorrowRequest;
import com.example.demo.dto.response.BorrowResponse;
import com.example.demo.entity.Book;
import com.example.demo.entity.BorrowRecord;
import com.example.demo.entity.Member;
import com.example.demo.entity.enums.BorrowStatus;
import com.example.demo.entity.enums.LoanType;
import com.example.demo.repository.BookRepository;
import com.example.demo.repository.BorrowRecordRepository;
import com.example.demo.repository.MemberRepository;
import com.example.demo.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BorrowServiceTest {

    @Mock
    private BorrowRecordRepository borrowRecordRepository;

    @Mock
    private BookRepository bookRepository;

    @Mock
    private MemberRepository memberRepository;

    @InjectMocks
    private BorrowService borrowService;

    private Member mockMember;
    private Book mockBook;
    private BorrowRequest request;

    @BeforeEach
    void setUp() {
        mockMember = TestDataFactory.createMockMember(1L);
        mockBook = TestDataFactory.createMockBook(100L, 5);
        request = TestDataFactory.createBorrowRequest(1L, 100L);
    }

    // =========================================================
    // borrowBook()
    // =========================================================

    @Test
    void borrowBook_Success_TriggersSaveAndDecreasesQuantity() {
        when(memberRepository.findByIdForUpdate(1L))
                .thenReturn(Optional.of(mockMember));

        when(bookRepository.findByIdForUpdate(100L))
                .thenReturn(Optional.of(mockBook));

        when(borrowRecordRepository.existsByMemberIdAndLoanTypeAndStatusIn(
                eq(1L), eq(LoanType.PAPER), anyList()))
                .thenReturn(false);

        when(borrowRecordRepository.save(any(BorrowRecord.class)))
                .thenAnswer(invocation -> {
                    BorrowRecord record = invocation.getArgument(0);
                    record.setId(10L);
                    return record;
                });

        BorrowResponse response = borrowService.borrowBook(request);

        assertNotNull(response);
        assertEquals(10L, response.getId());
        assertEquals(4, mockBook.getAvailableQuantity());
        assertEquals(BorrowStatus.BORROWING, response.getStatus());
        assertEquals(LoanType.PAPER, response.getLoanType());

        verify(bookRepository).save(mockBook);
        verify(borrowRecordRepository).save(any(BorrowRecord.class));
    }

    @Test
    void borrowBook_Fail_WhenMemberNotFound() {
        when(memberRepository.findByIdForUpdate(1L))
                .thenReturn(Optional.empty());

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> borrowService.borrowBook(request)
        );

        assertEquals("Không tìm thấy độc giả hợp lệ", exception.getMessage());

        verifyNoInteractions(bookRepository);
        verify(borrowRecordRepository, never()).save(any(BorrowRecord.class));
        verify(borrowRecordRepository, never())
                .existsByMemberIdAndLoanTypeAndStatusIn(
                        any(), any(), anyList());
    }

    @Test
    void borrowBook_Fail_WhenMemberHasUnreturnedBook() {
        when(memberRepository.findByIdForUpdate(1L))
                .thenReturn(Optional.of(mockMember));

        when(bookRepository.findByIdForUpdate(100L))
                .thenReturn(Optional.of(mockBook));

        when(borrowRecordRepository.existsByMemberIdAndLoanTypeAndStatusIn(
                eq(1L), eq(LoanType.PAPER), anyList()))
                .thenReturn(true);

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> borrowService.borrowBook(request)
        );

        assertEquals(
                "Bạn đang có yêu cầu mượn hoặc sách giấy chưa trả",
                exception.getMessage()
        );

        assertEquals(5, mockBook.getAvailableQuantity());
        verify(bookRepository, never()).save(any(Book.class));
        verify(borrowRecordRepository, never()).save(any(BorrowRecord.class));
    }

    @Test
    void borrowBook_Fail_WhenBookNotFound() {
        when(memberRepository.findByIdForUpdate(1L))
                .thenReturn(Optional.of(mockMember));

        when(bookRepository.findByIdForUpdate(100L))
                .thenReturn(Optional.empty());

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> borrowService.borrowBook(request)
        );

        assertEquals("Sách không tồn tại", exception.getMessage());

        verify(bookRepository, never()).save(any(Book.class));
        verify(borrowRecordRepository, never()).save(any(BorrowRecord.class));
        verify(borrowRecordRepository, never())
                .existsByMemberIdAndLoanTypeAndStatusIn(
                        any(), any(), anyList());
    }

    @Test
    void borrowBook_Fail_WhenBookOutOfStock() {
        mockBook.setAvailableQuantity(0);

        when(memberRepository.findByIdForUpdate(1L))
                .thenReturn(Optional.of(mockMember));

        when(bookRepository.findByIdForUpdate(100L))
                .thenReturn(Optional.of(mockBook));

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> borrowService.borrowBook(request)
        );

        assertEquals(
                "Sách này hiện đã hết trên kệ!",
                exception.getMessage()
        );

        assertEquals(0, mockBook.getAvailableQuantity());
        verify(bookRepository, never()).save(any(Book.class));
        verify(borrowRecordRepository, never()).save(any(BorrowRecord.class));
        verify(borrowRecordRepository, never())
                .existsByMemberIdAndLoanTypeAndStatusIn(
                        any(), any(), anyList());
    }

    // =========================================================
    // returnBook()
    // =========================================================

    @Test
    void returnBook_Success_UpdatesStatusAndIncreasesQuantity() {
        mockBook.setAvailableQuantity(4);

        BorrowRecord record = new BorrowRecord();
        record.setId(10L);
        record.setMember(mockMember);
        record.setBook(mockBook);
        record.setLoanType(LoanType.PAPER);
        record.setBorrowDate(LocalDate.now().minusDays(5));
        record.setDueDate(LocalDate.now().plusDays(9));
        record.setStatus(BorrowStatus.BORROWING);

        when(borrowRecordRepository.findByIdForUpdate(10L))
                .thenReturn(Optional.of(record));

        when(bookRepository.findByIdForUpdate(100L))
                .thenReturn(Optional.of(mockBook));

        when(borrowRecordRepository.save(any(BorrowRecord.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        BorrowResponse response = borrowService.returnBook(10L);

        assertNotNull(response);
        assertEquals(10L, response.getId());
        assertEquals("Nguyễn Văn Test", response.getMemberName());
        assertEquals("Clean Code", response.getBookTitle());
        assertEquals(BorrowStatus.RETURNED, response.getStatus());
        assertEquals(LoanType.PAPER, response.getLoanType());

        assertNotNull(response.getReturnDate());
        assertEquals(LocalDate.now(), response.getReturnDate());
        assertEquals(5, mockBook.getAvailableQuantity());
        assertEquals(BorrowStatus.RETURNED, record.getStatus());
        assertNotNull(record.getReturnDate());

        verify(bookRepository).save(mockBook);
        verify(borrowRecordRepository).save(record);
    }

    @Test
    void returnBook_Fail_WhenBorrowRecordNotFound() {
        when(borrowRecordRepository.findByIdForUpdate(10L))
                .thenReturn(Optional.empty());

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> borrowService.returnBook(10L)
        );

        assertEquals("Không tìm thấy phiếu mượn này", exception.getMessage());

        verify(bookRepository, never()).findByIdForUpdate(any());
        verify(bookRepository, never()).save(any(Book.class));
        verify(borrowRecordRepository, never()).save(any(BorrowRecord.class));
    }

    @Test
    void returnBook_Fail_WhenBookAlreadyReturned() {
        mockBook.setAvailableQuantity(4);

        BorrowRecord record = new BorrowRecord();
        record.setId(10L);
        record.setMember(mockMember);
        record.setBook(mockBook);
        record.setLoanType(LoanType.PAPER);
        record.setStatus(BorrowStatus.RETURNED);
        record.setReturnDate(LocalDate.now().minusDays(1));

        when(borrowRecordRepository.findByIdForUpdate(10L))
                .thenReturn(Optional.of(record));

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> borrowService.returnBook(10L)
        );

        assertEquals(
                "Chỉ có thể trả sách đang mượn hoặc đã quá hạn",
                exception.getMessage()
        );

        assertEquals(BorrowStatus.RETURNED, record.getStatus());
        assertEquals(4, mockBook.getAvailableQuantity());

        verify(bookRepository, never()).findByIdForUpdate(any());
        verify(bookRepository, never()).save(any(Book.class));
        verify(borrowRecordRepository, never()).save(any(BorrowRecord.class));
    }
}
