
package com.example.demo.repository;

import com.example.demo.entity.Book;
import com.example.demo.entity.enums.BorrowStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookRepository
        extends JpaRepository<Book, Long>,
                JpaSpecificationExecutor<Book> {

    Optional<Book> findByIdAndDeletedFalse(Long id);

    Optional<Book> findByIdAndDeletedTrue(Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT b FROM Book b
        WHERE b.id = :id AND b.deleted = false
        """)
    Optional<Book> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT b FROM Book b
        WHERE b.id = :id AND b.deleted = true
        """)
    Optional<Book> findDeletedByIdForUpdate(@Param("id") Long id);

    List<Book> findAllByDeletedFalse();
    
    boolean existsByCategory_Id(Long categoryId);
    /*
     * Danh sách sách có ít nhất một phiếu mượn đang hoạt động.
     * Chỉ tính BORROWING và OVERDUE, đồng thời chưa có ngày trả.
     */
    @Query("""
        SELECT DISTINCT b FROM Book b
        JOIN BorrowRecord br ON br.book = b
        JOIN br.member m
        WHERE b.deleted = false
          AND m.deleted = false
          AND br.returnDate IS NULL
          AND br.status IN :statuses
        ORDER BY b.title ASC
        """)
    List<Book> findBooksWithActiveLoans(
            @Param("statuses") List<BorrowStatus> statuses
    );

    /*
     * Tìm kiếm sách đang được mượn theo tên sách, tác giả hoặc ISBN.
     * Không tìm thấy kết quả sẽ trả về danh sách rỗng.
     */
    @Query("""
        SELECT DISTINCT b FROM Book b
        JOIN BorrowRecord br ON br.book = b
        JOIN br.member m
        WHERE b.deleted = false
          AND m.deleted = false
          AND br.returnDate IS NULL
          AND br.status IN :statuses
          AND (
                :keyword IS NULL
                OR LOWER(b.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(COALESCE(b.author, ''))
                    LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(COALESCE(b.isbn, ''))
                    LIKE LOWER(CONCAT('%', :keyword, '%'))
          )
        ORDER BY b.title ASC
        """)
    List<Book> searchBorrowedBooks(
            @Param("keyword") String keyword,
            @Param("statuses") List<BorrowStatus> statuses,
            Pageable pageable
    );

    List<Book> findAllByDeletedTrue();

    /*
     * Bao gồm cả sách đang hoạt động và sách trong thùng rác.
     * Dùng để kiểm tra ISBN trùng trong toàn hệ thống.
     */
    List<Book> findAllByIsbnIsNotNull();

    boolean existsByIsbnAndDeletedFalse(String isbn);

    boolean existsByIsbnAndDeletedFalseAndIdNot(
            String isbn,
            Long id
    );

    // ==================== DASHBOARD STATISTICS ====================

    long countByDeletedFalse();

    long countByDeletedFalseAndAvailableQuantity(int availableQuantity);

    @Query("""
        SELECT COALESCE(SUM(b.totalQuantity), 0)
        FROM Book b
        WHERE b.deleted = false
        """)
    long sumTotalCopiesOfActiveBooks();

    @Query("""
        SELECT COALESCE(SUM(b.availableQuantity), 0)
        FROM Book b
        WHERE b.deleted = false
        """)
    long sumAvailableCopiesOfActiveBooks();
}
