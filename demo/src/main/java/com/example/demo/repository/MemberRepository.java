
package com.example.demo.repository;

import com.example.demo.entity.Member;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface MemberRepository
        extends JpaRepository<Member, Long>,
                JpaSpecificationExecutor<Member> {

    // Tìm hồ sơ theo User, kể cả khi hồ sơ đã bị xóa mềm.
    Optional<Member> findByUserId(Long userId);

    // Chỉ tìm hồ sơ đang hoạt động.
    Optional<Member> findByUserIdAndDeletedFalse(Long userId);

    Optional<Member> findByIdAndDeletedFalse(Long id);

    Optional<Member> findByIdAndDeletedTrue(Long id);

    Optional<Member> findByUser_EmailAndDeletedFalse(String email);

    List<Member> findAllByDeletedTrue();

    // Khóa hồ sơ thành viên khi xử lý yêu cầu mượn sách.
    // Ngăn các yêu cầu đồng thời của cùng một thành viên vượt qua kiểm tra mượn.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT m
        FROM Member m
        WHERE m.id = :memberId
          AND m.deleted = false
        """)
    Optional<Member> findByIdForUpdate(@Param("memberId") Long memberId);

    // ==================== DASHBOARD STATISTICS ====================

    // Tổng số hồ sơ thành viên đang hoạt động.
    long countByDeletedFalse();

    // Số thành viên mới trong khoảng thời gian được chỉ định.
    long countByDeletedFalseAndCreatedAtAfter(
            LocalDateTime dateTime
    );

    // Số thành viên đang hoạt động có tài khoản đã xác minh.
    @Query("""
        SELECT COUNT(m)
        FROM Member m
        WHERE m.deleted = false
          AND m.user.isVerified = true
        """)
    long countVerifiedActiveMembers();
}
