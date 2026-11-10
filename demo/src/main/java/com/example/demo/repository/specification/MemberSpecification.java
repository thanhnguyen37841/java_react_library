
package com.example.demo.repository.specification;

import com.example.demo.entity.BorrowRecord;
import com.example.demo.entity.Member;
import com.example.demo.entity.User;
import com.example.demo.entity.enums.BorrowStatus;
import com.example.demo.util.DateUtils;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class MemberSpecification {

    public static Specification<Member> search(
            String name,
            String email,
            String phoneNumber,
            String address,
            String birthFrom,
            String birthTo,
            Long bookId,
            Boolean isVerified) {

        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Chỉ lấy thành viên chưa bị xóa.
            predicates.add(
                    criteriaBuilder.isFalse(root.get("deleted"))
            );

            // Tìm theo tên thành viên.
            if (StringUtils.hasText(name)) {
                predicates.add(
                        criteriaBuilder.like(
                                criteriaBuilder.lower(root.get("fullName")),
                                "%" + name.trim().toLowerCase() + "%"
                        )
                );
            }

            // Tìm theo số điện thoại.
            if (StringUtils.hasText(phoneNumber)) {
                predicates.add(
                        criteriaBuilder.like(
                                criteriaBuilder.lower(root.get("phoneNumber")),
                                "%" + phoneNumber.trim().toLowerCase() + "%"
                        )
                );
            }

            // Tìm theo địa chỉ.
            if (StringUtils.hasText(address)) {
                predicates.add(
                        criteriaBuilder.like(
                                criteriaBuilder.lower(root.get("address")),
                                "%" + address.trim().toLowerCase() + "%"
                        )
                );
            }

            // Lọc email và trạng thái xác thực.
            Join<Member, User> userJoin =
                    root.join("user", JoinType.LEFT);

            if (StringUtils.hasText(email)) {
                predicates.add(
                        criteriaBuilder.like(
                                criteriaBuilder.lower(userJoin.get("email")),
                                "%" + email.trim().toLowerCase() + "%"
                        )
                );
            }

            if (isVerified != null) {
                predicates.add(
                        criteriaBuilder.equal(
                                userJoin.get("isVerified"),
                                isVerified
                        )
                );
            }

            // Lọc ngày sinh từ.
            if (StringUtils.hasText(birthFrom)) {
                LocalDate from = DateUtils.parseDate(birthFrom);

                predicates.add(
                        criteriaBuilder.greaterThanOrEqualTo(
                                root.get("dateOfBirth"),
                                from
                        )
                );
            }

            // Lọc ngày sinh đến.
            if (StringUtils.hasText(birthTo)) {
                LocalDate to = DateUtils.parseDate(birthTo);

                predicates.add(
                        criteriaBuilder.lessThanOrEqualTo(
                                root.get("dateOfBirth"),
                                to
                        )
                );
            }

            // Lọc thành viên đang mượn một cuốn sách cụ thể.
            if (bookId != null) {
                Join<Member, BorrowRecord> borrowJoin =
                        root.join("borrowRecords", JoinType.INNER);

                predicates.add(
                        criteriaBuilder.equal(
                                borrowJoin.get("book").get("id"),
                                bookId
                        )
                );

                // Chỉ tính phiếu đang mượn hoặc quá hạn.
                predicates.add(
                        borrowJoin.get("status").in(
                                BorrowStatus.BORROWING,
                                BorrowStatus.OVERDUE
                        )
                );

                // Chưa có ngày trả.
                predicates.add(
                        criteriaBuilder.isNull(
                                borrowJoin.get("returnDate")
                        )
                );
            }

            // Tránh thành viên xuất hiện nhiều lần nếu có nhiều phiếu mượn.
            query.distinct(true);

            return criteriaBuilder.and(
                    predicates.toArray(new Predicate[0])
            );
        };
    }
}
