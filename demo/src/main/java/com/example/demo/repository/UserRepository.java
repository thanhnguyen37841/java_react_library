package com.example.demo.repository;

import com.example.demo.dto.response.AdminUserOptionResponse;
import com.example.demo.entity.User;
import com.example.demo.entity.enums.RoleName;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    @EntityGraph(attributePaths = {"roles", "roles.permissions"})
    Optional<User> findByEmail(String email);

    /**
     * Khóa bản ghi User trong transaction hiện tại.
     *
     * Các lần đăng nhập đồng thời của cùng một tài khoản sẽ phải
     * lần lượt lấy được khóa này trước khi thay thế phiên đăng nhập.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.id = :id")
    Optional<User> findByIdForUpdate(@Param("id") Long id);

    /**
     * Tìm tài khoản đã xác thực nhưng chưa từng liên kết Member.
     * Bao gồm cả trường hợp Member đã bị xóa mềm.
     *
     * Giữ nguyên điều kiện này vì API được sử dụng cho luồng tạo Member.
     */
    @Query("""
        SELECT new com.example.demo.dto.response.AdminUserOptionResponse(
            u.id, u.email, COALESCE(m.fullName, ''), u.isVerified
        )
        FROM User u
        LEFT JOIN u.member m
        WHERE u.isVerified = true
          AND m.id IS NULL
          AND (
            :keyword = ''
            OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(COALESCE(m.fullName, ''))
                LIKE LOWER(CONCAT('%', :keyword, '%'))
          )
        ORDER BY u.id DESC
        """)
    Page<AdminUserOptionResponse> searchAdminUserOptions(
            @Param("keyword") String keyword,
            Pageable pageable
    );

    /**
     * Danh sách tài khoản có thể được gán vào nhóm quyền.
     *
     * Bao gồm tài khoản đã có Member.
     * Loại mọi tài khoản có ROLE_ADMIN, kể cả tài khoản có nhiều Role.
     */
    @Query("""
        SELECT new com.example.demo.dto.response.AdminUserOptionResponse(
            u.id, u.email, COALESCE(m.fullName, ''), u.isVerified
        )
        FROM User u
        LEFT JOIN u.member m
        WHERE u.isVerified = true
          AND NOT EXISTS (
              SELECT r
              FROM User adminUser
              JOIN adminUser.roles r
              WHERE adminUser = u
                AND r.name = :excludedRole
          )
          AND (
            :keyword = ''
            OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(COALESCE(m.fullName, ''))
                LIKE LOWER(CONCAT('%', :keyword, '%'))
          )
        ORDER BY u.id DESC
        """)
    Page<AdminUserOptionResponse> searchPermissionGroupAssignableUsers(
            @Param("keyword") String keyword,
            @Param("excludedRole") RoleName excludedRole,
            Pageable pageable
    );
}