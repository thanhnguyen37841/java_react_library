package com.example.demo.repository;

import com.example.demo.entity.BorrowRecord;
import com.example.demo.entity.enums.BorrowStatus;
import com.example.demo.entity.enums.LoanType;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface BorrowRecordRepository
        extends JpaRepository<BorrowRecord, Long> {

    boolean existsByMemberIdAndStatusIn(
            Long memberId,
            List<BorrowStatus> statuses
    );

    boolean existsByMemberIdAndLoanTypeAndStatusIn(
            Long memberId,
            LoanType loanType,
            List<BorrowStatus> statuses
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT br FROM BorrowRecord br WHERE br.id = :id")
    Optional<BorrowRecord> findByIdForUpdate(
            @Param("id") Long id
    );

    @Query("""
            SELECT br FROM BorrowRecord br
            JOIN br.member m
            JOIN br.book b
            WHERE (:keyword IS NULL
                OR LOWER(m.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(b.title) LIKE LOWER(CONCAT('%', :keyword, '%')))
            AND (:status IS NULL OR br.status = :status)
            """)
    Page<BorrowRecord> searchBorrowRecords(
            @Param("keyword") String keyword,
            @Param("status") BorrowStatus status,
            Pageable pageable
    );

    @Query("""
            SELECT br FROM BorrowRecord br
            JOIN br.member m
            JOIN m.user u
            JOIN br.book b
            WHERE LOWER(u.email) = LOWER(:email)
            AND (:keyword IS NULL
                OR LOWER(b.title) LIKE LOWER(CONCAT('%', :keyword, '%')))
            AND (:status IS NULL OR br.status = :status)
            AND m.deleted = false
            """)
    Page<BorrowRecord> searchMyBorrowRecords(
            @Param("email") String email,
            @Param("keyword") String keyword,
            @Param("status") BorrowStatus status,
            Pageable pageable
    );

    @Query("""
            SELECT COUNT(br) > 0 FROM BorrowRecord br
            JOIN br.member m
            JOIN m.user u
            JOIN br.book b
            WHERE LOWER(u.email) = LOWER(:email)
              AND b.id = :bookId
              AND br.loanType = :loanType
              AND br.status IN :statuses
              AND m.deleted = false
            """)
    boolean existsMyLoanForBook(
            @Param("email") String email,
            @Param("bookId") Long bookId,
            @Param("loanType") LoanType loanType,
            @Param("statuses") List<BorrowStatus> statuses
    );

    @Query("""
            SELECT COUNT(br) > 0 FROM BorrowRecord br
            JOIN br.member m
            JOIN m.user u
            JOIN br.book b
            WHERE LOWER(u.email) = LOWER(:email)
              AND b.id = :bookId
              AND br.loanType = :loanType
              AND br.status = :status
              AND br.dueDate >= :today
              AND m.deleted = false
            """)
    boolean existsValidEbookLoan(
            @Param("email") String email,
            @Param("bookId") Long bookId,
            @Param("loanType") LoanType loanType,
            @Param("status") BorrowStatus status,
            @Param("today") LocalDate today
    );

    @Query("""
            SELECT br FROM BorrowRecord br
            JOIN br.member m
            JOIN m.user u
            WHERE br.id = :id
              AND LOWER(u.email) = LOWER(:email)
            """)
    Optional<BorrowRecord> findOwnedRecord(
            @Param("id") Long id,
            @Param("email") String email
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT br FROM BorrowRecord br
            JOIN br.member m
            JOIN m.user u
            WHERE br.id = :id
              AND LOWER(u.email) = LOWER(:email)
              AND m.deleted = false
            """)
    Optional<BorrowRecord> findOwnedRecordForUpdate(
            @Param("id") Long id,
            @Param("email") String email
    );

    // ==================== DASHBOARD STATISTICS ====================

    // Tổng số phiếu mượn/trả theo trạng thái.
    long countByStatus(BorrowStatus status);

    // Số phiếu ở trạng thái chỉ định có hạn trả trước ngày hiện tại.
    long countByStatusAndDueDateBefore(
            BorrowStatus status,
            LocalDate dueDate
    );
}