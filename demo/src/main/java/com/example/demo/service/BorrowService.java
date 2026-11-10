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
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BorrowService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final int LOAN_DAYS = 14;

    private static final List<BorrowStatus> ACTIVE_PAPER_STATUSES = List.of(
            BorrowStatus.BORROW_REQUESTED,
            BorrowStatus.BORROW_APPROVED,
            BorrowStatus.BORROWING,
            BorrowStatus.OVERDUE
    );

    private final BorrowRecordRepository borrowRecordRepository;
    private final BookRepository bookRepository;
    private final MemberRepository memberRepository;

    @Transactional(readOnly = true)
    public BorrowResponse getBorrowById(Long id) {
        BorrowRecord record = borrowRecordRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy phiếu mượn này"
                ));

        return mapToResponse(record);
    }

    @Transactional(readOnly = true)
    public Page<BorrowResponse> searchBorrowRecords(
            String keyword,
            BorrowStatus status,
            int page,
            int size) {

        return borrowRecordRepository.searchBorrowRecords(
                normalizeKeyword(keyword),
                status,
                createPageable(page, size)
        ).map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public Page<BorrowResponse> searchMyBorrowRecords(
            String email,
            String keyword,
            BorrowStatus status,
            int page,
            int size) {

        requireEmail(email);

        if (page < 0) {
            throw new IllegalArgumentException(
                    "Số trang không được nhỏ hơn 0"
            );
        }

        if (size < 1 || size > 10) {
            throw new IllegalArgumentException(
                    "Kích thước trang phải từ 1 đến 10"
            );
        }

        return borrowRecordRepository.searchMyBorrowRecords(
                email.trim(),
                normalizeKeyword(keyword),
                status,
                createPageable(page, size)
        ).map(this::mapToResponse);
    }

    /**
     * Luồng quản lý cũ được giữ lại:
     * Admin tạo phiếu và ghi nhận giao sách ngay.
     */
    @Transactional
    public BorrowResponse borrowBook(BorrowRequest request) {
        validateRequest(request);

        Member member = memberRepository.findByIdForUpdate(
                request.getMemberId()
        ).orElseThrow(() -> new IllegalArgumentException(
                "Không tìm thấy độc giả hợp lệ"
        ));

        Book book = bookRepository.findByIdForUpdate(
                request.getBookId()
        ).orElseThrow(() -> new IllegalArgumentException(
                "Sách không tồn tại"
        ));

        if (book.getAvailableQuantity() <= 0) {
            throw new IllegalStateException(
                    "Sách này hiện đã hết trên kệ!"
            );
        }

        ensureNoActivePaperLoan(member.getId());

        book.setAvailableQuantity(book.getAvailableQuantity() - 1);
        bookRepository.save(book);

        LocalDate today = LocalDate.now();

        BorrowRecord record = new BorrowRecord();
        record.setMember(member);
        record.setBook(book);
        record.setLoanType(LoanType.PAPER);
        record.setBorrowDate(today);
        record.setDueDate(today.plusDays(LOAN_DAYS));
        record.setStatus(BorrowStatus.BORROWING);

        return mapToResponse(borrowRecordRepository.save(record));
    }

    /**
     * Độc giả gửi yêu cầu mượn sách giấy.
     * Chưa trừ kho cho đến khi yêu cầu được duyệt.
     */
    @Transactional
    public BorrowResponse requestPaperBorrow(String email, Long bookId) {
        requireEmail(email);

        if (bookId == null) {
            throw new IllegalArgumentException(
                    "ID sách không được để trống"
            );
        }

        Member currentMember = memberRepository
                .findByUser_EmailAndDeletedFalse(email.trim())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Tài khoản chưa có hồ sơ độc giả hợp lệ"
                ));

        Member member = memberRepository.findByIdForUpdate(
                currentMember.getId()
        ).orElseThrow(() -> new IllegalArgumentException(
                "Hồ sơ độc giả không tồn tại hoặc đã bị xóa"
        ));

        ensureNoActivePaperLoan(member.getId());

        Book book = bookRepository.findByIdAndDeletedFalse(bookId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Sách không tồn tại"
                ));

        BorrowRecord record = new BorrowRecord();
        record.setMember(member);
        record.setBook(book);
        record.setLoanType(LoanType.PAPER);
        record.setBorrowDate(null);
        record.setDueDate(null);
        record.setStatus(BorrowStatus.BORROW_REQUESTED);

        return mapToResponse(borrowRecordRepository.save(record));
    }

    /**
     * Hủy yêu cầu mượn sách giấy đang chờ xử lý.
     *
     * Người dùng thông thường chỉ được hủy phiếu của chính mình.
     * Admin hoặc nhân viên có BORROW_CANCEL được hủy phiếu của người khác.
     *
     * Chỉ BORROW_REQUESTED được phép hủy.
     * Trạng thái này chưa làm giảm số lượng sách trong kho,
     * do đó thao tác hủy không cần hoàn lại số lượng sách.
     *
     * Bản ghi được khóa trước khi kiểm tra trạng thái để tránh
     * xung đột với thao tác duyệt hoặc hủy đồng thời.
     */
    @Transactional
    public BorrowResponse cancelPaperBorrow(
            String email,
            Long id,
            boolean canCancelAnyRequest) {

        BorrowRecord record;

        if (canCancelAnyRequest) {
            record = findRecordForUpdate(id);
        } else {
            requireEmail(email);

            if (id == null) {
                throw new IllegalArgumentException(
                        "ID phiếu mượn không được để trống"
                );
            }

            record = borrowRecordRepository.findOwnedRecordForUpdate(
                    id,
                    email.trim()
            ).orElseThrow(() -> new IllegalArgumentException(
                    "Không tìm thấy phiếu mượn của tài khoản"
            ));
        }

        requireLoanType(record, LoanType.PAPER);

        if (record.getStatus() != BorrowStatus.BORROW_REQUESTED) {
            throw new IllegalStateException(
                    "Chỉ có thể hủy yêu cầu mượn đang chờ xử lý"
            );
        }

        record.setStatus(BorrowStatus.BORROW_CANCELLED);

        return mapToResponse(borrowRecordRepository.save(record));
    }

    @Transactional
    public BorrowResponse approvePaperBorrow(Long id) {
        BorrowRecord record = findRecordForUpdate(id);

        requireLoanType(record, LoanType.PAPER);

        if (record.getStatus() != BorrowStatus.BORROW_REQUESTED) {
            throw new IllegalStateException(
                    "Chỉ có thể duyệt yêu cầu đang chờ xử lý"
            );
        }

        Book book = bookRepository.findByIdForUpdate(
                record.getBook().getId()
        ).orElseThrow(() -> new IllegalArgumentException(
                "Sách không tồn tại hoặc đã bị xóa"
        ));

        if (book.getAvailableQuantity() <= 0) {
            throw new IllegalStateException(
                    "Không còn bản sách khả dụng để duyệt yêu cầu này"
            );
        }

        book.setAvailableQuantity(book.getAvailableQuantity() - 1);
        bookRepository.save(book);

        record.setStatus(BorrowStatus.BORROW_APPROVED);

        return mapToResponse(borrowRecordRepository.save(record));
    }

    @Transactional
    public BorrowResponse rejectPaperBorrow(Long id) {
        BorrowRecord record = findRecordForUpdate(id);

        requireLoanType(record, LoanType.PAPER);

        if (record.getStatus() != BorrowStatus.BORROW_REQUESTED
                && record.getStatus() != BorrowStatus.BORROW_APPROVED) {

            throw new IllegalStateException(
                    "Chỉ có thể từ chối yêu cầu đang chờ duyệt hoặc chờ nhận sách"
            );
        }

        if (record.getStatus() == BorrowStatus.BORROW_APPROVED) {
            Book book = bookRepository.findByIdForUpdate(
                    record.getBook().getId()
            ).orElseThrow(() -> new IllegalArgumentException(
                    "Không tìm thấy sách"
            ));

            book.setAvailableQuantity(book.getAvailableQuantity() + 1);
            bookRepository.save(book);
        }

        record.setStatus(BorrowStatus.BORROW_REJECTED);

        return mapToResponse(borrowRecordRepository.save(record));
    }

    @Transactional
    public BorrowResponse handoverPaperBook(Long id) {
        BorrowRecord record = findRecordForUpdate(id);

        requireLoanType(record, LoanType.PAPER);

        if (record.getStatus() != BorrowStatus.BORROW_APPROVED) {
            throw new IllegalStateException(
                    "Yêu cầu phải được duyệt trước khi xác nhận giao sách"
            );
        }

        LocalDate today = LocalDate.now();

        record.setBorrowDate(today);
        record.setDueDate(today.plusDays(LOAN_DAYS));
        record.setReturnDate(null);
        record.setStatus(BorrowStatus.BORROWING);

        return mapToResponse(borrowRecordRepository.save(record));
    }

    /**
     * Mượn ebook trực tuyến:
     * cấp quyền đọc 14 ngày, không tác động tồn kho sách giấy.
     */
    @Transactional
    public BorrowResponse borrowEbookForCurrentUser(
            String email,
            Long bookId) {

        requireEmail(email);

        if (bookId == null) {
            throw new IllegalArgumentException(
                    "ID sách không được để trống"
            );
        }

        Member member = memberRepository
                .findByUser_EmailAndDeletedFalse(email.trim())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Tài khoản chưa có hồ sơ độc giả hợp lệ"
                ));

        Book book = bookRepository.findByIdAndDeletedFalse(bookId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Sách không tồn tại"
                ));

        if (book.getEbookFilePath() == null
                || book.getEbookFilePath().isBlank()) {

            throw new IllegalStateException(
                    "Đầu sách này chưa có bản điện tử"
            );
        }

        boolean alreadyActive = borrowRecordRepository.existsMyLoanForBook(
                email.trim(),
                bookId,
                LoanType.EBOOK,
                List.of(
                        BorrowStatus.BORROWING,
                        BorrowStatus.OVERDUE
                )
        );

        if (alreadyActive) {
            throw new IllegalStateException(
                    "Bạn đã có quyền đọc sách điện tử này"
            );
        }

        LocalDate today = LocalDate.now();

        BorrowRecord record = new BorrowRecord();
        record.setMember(member);
        record.setBook(book);
        record.setLoanType(LoanType.EBOOK);
        record.setBorrowDate(today);
        record.setDueDate(today.plusDays(LOAN_DAYS));
        record.setStatus(BorrowStatus.BORROWING);

        return mapToResponse(borrowRecordRepository.save(record));
    }

    @Transactional
    public BorrowResponse returnBook(Long recordId) {
        BorrowRecord record = findRecordForUpdate(recordId);

        requireLoanType(record, LoanType.PAPER);

        completeReturn(record);

        return mapToResponse(record);
    }

    @Transactional
    public BorrowResponse returnEbookForCurrentUser(
            String email,
            Long recordId) {

        requireEmail(email);

        BorrowRecord record = borrowRecordRepository
                .findOwnedRecord(recordId, email.trim())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy phiếu mượn của tài khoản"
                ));

        // Nạp lại bản ghi có khóa để tránh trả trùng đồng thời.
        record = findRecordForUpdate(recordId);

        if (!record.getMember().getUser().getEmail()
                .equalsIgnoreCase(email.trim())) {

            throw new IllegalArgumentException(
                    "Bạn không có quyền trả lượt đọc này"
            );
        }

        requireLoanType(record, LoanType.EBOOK);

        completeReturn(record);

        return mapToResponse(record);
    }

    @Transactional(readOnly = true)
    public String getAuthorizedEbookPath(String email, Long bookId) {
        requireEmail(email);

        boolean hasActiveLoan = borrowRecordRepository.existsValidEbookLoan(
                email.trim(),
                bookId,
                LoanType.EBOOK,
                BorrowStatus.BORROWING,
                LocalDate.now()
        );

        if (!hasActiveLoan) {
            throw new IllegalStateException(
                    "Bạn chưa mượn ebook này hoặc quyền đọc đã hết hạn"
            );
        }

        Book book = bookRepository.findByIdAndDeletedFalse(bookId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Sách không tồn tại"
                ));

        if (book.getEbookFilePath() == null
                || book.getEbookFilePath().isBlank()) {

            throw new IllegalStateException(
                    "Tệp ebook không tồn tại"
            );
        }

        return book.getEbookFilePath();
    }

    private void completeReturn(BorrowRecord record) {
        if (record.getStatus() != BorrowStatus.BORROWING
                && record.getStatus() != BorrowStatus.OVERDUE) {

            throw new IllegalStateException(
                    "Chỉ có thể trả sách đang mượn hoặc đã quá hạn"
            );
        }

        record.setStatus(BorrowStatus.RETURNED);
        record.setReturnDate(LocalDate.now());

        if (record.getLoanType() == LoanType.PAPER) {
            Book book = bookRepository.findByIdForUpdate(
                    record.getBook().getId()
            ).orElseThrow(() -> new IllegalArgumentException(
                    "Không tìm thấy sách"
            ));

            book.setAvailableQuantity(book.getAvailableQuantity() + 1);
            bookRepository.save(book);
        }

        borrowRecordRepository.save(record);
    }

    private BorrowRecord findRecordForUpdate(Long id) {
        if (id == null) {
            throw new IllegalArgumentException(
                    "ID phiếu mượn không được để trống"
            );
        }

        return borrowRecordRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy phiếu mượn này"
                ));
    }

    private void ensureNoActivePaperLoan(Long memberId) {
        if (borrowRecordRepository.existsByMemberIdAndLoanTypeAndStatusIn(
                memberId,
                LoanType.PAPER,
                ACTIVE_PAPER_STATUSES
        )) {
            throw new IllegalStateException(
                    "Bạn đang có yêu cầu mượn hoặc sách giấy chưa trả"
            );
        }
    }

    private void requireLoanType(BorrowRecord record, LoanType type) {
        if (record.getLoanType() != type) {
            throw new IllegalStateException(
                    "Loại phiếu mượn không phù hợp với thao tác này"
            );
        }
    }

    private void validateRequest(BorrowRequest request) {
        if (request == null
                || request.getMemberId() == null
                || request.getBookId() == null) {

            throw new IllegalArgumentException(
                    "ID độc giả và ID sách không được để trống"
            );
        }
    }

    private void requireEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException(
                    "Không xác định được tài khoản đăng nhập"
            );
        }
    }

    private Pageable createPageable(int page, int size) {
        if (page < 0) {
            throw new IllegalArgumentException(
                    "Số trang không được nhỏ hơn 0"
            );
        }

        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException(
                    "Kích thước trang phải từ 1 đến " + MAX_PAGE_SIZE
            );
        }

        return PageRequest.of(
                page,
                size,
                Sort.by(Sort.Direction.DESC, "createdAt")
                        .and(Sort.by(Sort.Direction.DESC, "id"))
        );
    }

    private String normalizeKeyword(String keyword) {
        return keyword == null || keyword.isBlank()
                ? null
                : keyword.trim();
    }

    private BorrowResponse mapToResponse(BorrowRecord record) {
        return BorrowResponse.builder()
                .id(record.getId())
                .memberName(record.getMember().getFullName())
                .bookTitle(record.getBook().getTitle())
                .bookId(record.getBook().getId())
                .borrowDate(record.getBorrowDate())
                .dueDate(record.getDueDate())
                .returnDate(record.getReturnDate())
                .status(record.getStatus())
                .loanType(record.getLoanType())
                .requestDate(record.getCreatedAt())
                .build();
    }
}