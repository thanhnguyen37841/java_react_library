package com.example.demo.repository.specification;

import com.example.demo.entity.Book;
import com.example.demo.entity.BorrowRecord;
import com.example.demo.entity.enums.BorrowStatus;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class BookSpecification {

    private BookSpecification() {
    }

    public static Specification<Book> search(
            String keyword,
            Long categoryId) {
        return search(
                keyword, categoryId, "ALL", "ALL",
                "ALL", "ALL", null,
                null, null, null, null, null, null
        );
    }

    public static Specification<Book> search(
            String keyword,
            Long categoryId,
            String stockStatus,
            String isbnStatus) {
        return search(
                keyword, categoryId, stockStatus, isbnStatus,
                "ALL", "ALL", null,
                null, null, null, null, null, null
        );
    }

    public static Specification<Book> search(
            String keyword,
            Long categoryId,
            String stockStatus,
            String isbnStatus,
            String ebookStatus,
            String myBorrowStatus,
            String email) {
        return search(
                keyword, categoryId, stockStatus, isbnStatus,
                ebookStatus, myBorrowStatus, email,
                null, null, null, null, null, null
        );
    }

    public static Specification<Book> search(
            String keyword,
            Long categoryId,
            String stockStatus,
            String isbnStatus,
            String ebookStatus,
            String myBorrowStatus,
            String email,
            String publisher,
            String language,
            Integer publicationYearFrom,
            Integer publicationYearTo,
            Integer minPageCount,
            Integer maxPageCount) {

        validateRanges(
                publicationYearFrom,
                publicationYearTo,
                minPageCount,
                maxPageCount
        );

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            predicates.add(cb.isFalse(root.get("deleted")));

            if (StringUtils.hasText(keyword)) {
                String normalizedKeyword = keyword.trim()
                        .toLowerCase(Locale.ROOT)
                        .replaceAll("\\s+", " ");

                String pattern = "%"
                        + escapeLike(normalizedKeyword)
                        + "%";

                Predicate titlePredicate = cb.like(
                        cb.lower(root.get("title")),
                        pattern,
                        '\\'
                );

                Predicate authorPredicate = cb.like(
                        cb.lower(root.get("author")),
                        pattern,
                        '\\'
                );

                String normalizedIsbn = keyword.trim()
                        .replaceAll("[\\s-]", "")
                        .toLowerCase(Locale.ROOT);

                Predicate isbnPredicate = cb.like(
                        cb.lower(root.get("isbn")),
                        "%" + escapeLike(normalizedIsbn) + "%",
                        '\\'
                );

                predicates.add(cb.or(
                        titlePredicate,
                        authorPredicate,
                        isbnPredicate
                ));
            }

            if (categoryId != null) {
                predicates.add(cb.equal(
                        root.get("category").get("id"),
                        categoryId
                ));
            }

            switch (normalizeFilter(stockStatus)) {
                case "AVAILABLE" -> predicates.add(
                        cb.greaterThan(root.get("availableQuantity"), 0)
                );
                case "LOW_STOCK" -> predicates.add(
                        cb.between(root.get("availableQuantity"), 1, 3)
                );
                case "OUT_OF_STOCK" -> predicates.add(
                        cb.equal(root.get("availableQuantity"), 0)
                );
                case "ALL" -> {
                }
                default -> throw new IllegalArgumentException(
                        "Tình trạng sách không hợp lệ: " + stockStatus
                );
            }

            switch (normalizeFilter(isbnStatus)) {
                case "HAS_ISBN" -> predicates.add(cb.and(
                        cb.isNotNull(root.get("isbn")),
                        cb.notEqual(cb.trim(root.get("isbn")), "")
                ));
                case "NO_ISBN" -> predicates.add(cb.or(
                        cb.isNull(root.get("isbn")),
                        cb.equal(cb.trim(root.get("isbn")), "")
                ));
                case "ALL" -> {
                }
                default -> throw new IllegalArgumentException(
                        "Bộ lọc ISBN không hợp lệ: " + isbnStatus
                );
            }

            switch (normalizeFilter(ebookStatus)) {
                case "HAS_EBOOK" -> predicates.add(
                        cb.isNotNull(root.get("ebookFilePath"))
                );
                case "NO_EBOOK" -> predicates.add(cb.or(
                        cb.isNull(root.get("ebookFilePath")),
                        cb.equal(cb.trim(root.get("ebookFilePath")), "")
                ));
                case "ALL" -> {
                }
                default -> throw new IllegalArgumentException(
                        "Bộ lọc ebook không hợp lệ: " + ebookStatus
                );
            }

            // Lọc nhà xuất bản, không phân biệt chữ hoa/chữ thường.
            if (StringUtils.hasText(publisher)) {
                predicates.add(cb.like(
                        cb.lower(root.get("publisher")),
                        "%" + escapeLike(publisher.trim().toLowerCase(Locale.ROOT)) + "%",
                        '\\'
                ));
            }

            // Lọc ngôn ngữ, không phân biệt chữ hoa/chữ thường.
            if (StringUtils.hasText(language)) {
                predicates.add(cb.like(
                        cb.lower(root.get("language")),
                        "%" + escapeLike(language.trim().toLowerCase(Locale.ROOT)) + "%",
                        '\\'
                ));
            }

            if (publicationYearFrom != null) {
                predicates.add(cb.greaterThanOrEqualTo(
                        root.get("publicationYear"),
                        publicationYearFrom
                ));
            }

            if (publicationYearTo != null) {
                predicates.add(cb.lessThanOrEqualTo(
                        root.get("publicationYear"),
                        publicationYearTo
                ));
            }

            if (minPageCount != null) {
                predicates.add(cb.greaterThanOrEqualTo(
                        root.get("pageCount"),
                        minPageCount
                ));
            }

            if (maxPageCount != null) {
                predicates.add(cb.lessThanOrEqualTo(
                        root.get("pageCount"),
                        maxPageCount
                ));
            }

            String borrowStatus = normalizeFilter(myBorrowStatus);

            if (!"ALL".equals(borrowStatus)) {
                if (!StringUtils.hasText(email)) {
                    throw new IllegalArgumentException(
                            "Cần đăng nhập để lọc theo lịch sử mượn cá nhân."
                    );
                }

                Subquery<Integer> subquery = query.subquery(Integer.class);
                var borrowRoot = subquery.from(BorrowRecord.class);
                Join<Object, Object> member = borrowRoot.join("member");
                Join<Object, Object> user = member.join("user");

                subquery.select(cb.literal(1));
                subquery.where(
                        cb.equal(
                                borrowRoot.get("book").get("id"),
                                root.get("id")
                        ),
                        cb.equal(
                                cb.lower(user.get("email")),
                                email.trim().toLowerCase(Locale.ROOT)
                        ),
                        cb.isFalse(member.get("deleted")),
                        personalStatusPredicate(cb, borrowRoot, borrowStatus)
                );

                switch (borrowStatus) {
                    case "ACTIVE", "HISTORY" ->
                            predicates.add(cb.exists(subquery));
                    case "NEVER" ->
                            predicates.add(cb.not(cb.exists(subquery)));
                    default -> throw new IllegalArgumentException(
                            "Trạng thái mượn cá nhân không hợp lệ: "
                                    + myBorrowStatus
                    );
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private static void validateRanges(
            Integer yearFrom,
            Integer yearTo,
            Integer pageMin,
            Integer pageMax) {

        if (yearFrom != null && yearFrom < 0
                || yearTo != null && yearTo < 0) {
            throw new IllegalArgumentException(
                    "Năm xuất bản không được nhỏ hơn 0."
            );
        }

        if (yearFrom != null && yearTo != null && yearFrom > yearTo) {
            throw new IllegalArgumentException(
                    "Năm xuất bản bắt đầu không được lớn hơn năm kết thúc."
            );
        }

        if (pageMin != null && pageMin < 0
                || pageMax != null && pageMax < 0) {
            throw new IllegalArgumentException(
                    "Số trang không được nhỏ hơn 0."
            );
        }

        if (pageMin != null && pageMax != null && pageMin > pageMax) {
            throw new IllegalArgumentException(
                    "Số trang tối thiểu không được lớn hơn số trang tối đa."
            );
        }
    }

    private static Predicate personalStatusPredicate(
            jakarta.persistence.criteria.CriteriaBuilder cb,
            jakarta.persistence.criteria.Root<BorrowRecord> borrowRoot,
            String status) {

        return switch (status) {
            case "ACTIVE" -> borrowRoot.get("status").in(
                    BorrowStatus.BORROW_REQUESTED,
                    BorrowStatus.BORROW_APPROVED,
                    BorrowStatus.BORROWING,
                    BorrowStatus.OVERDUE
            );
            case "HISTORY" -> borrowRoot.get("status").in(
                    BorrowStatus.BORROW_REJECTED,
                    BorrowStatus.RETURNED
            );
            case "NEVER" -> cb.conjunction();
            default -> throw new IllegalArgumentException(
                    "Trạng thái mượn cá nhân không hợp lệ: " + status
            );
        };
    }

    private static String escapeLike(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
    }

    private static String normalizeFilter(String value) {
        return StringUtils.hasText(value)
                ? value.trim().toUpperCase(Locale.ROOT)
                : "ALL";
    }
}
