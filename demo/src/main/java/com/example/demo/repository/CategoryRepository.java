package com.example.demo.repository;

import com.example.demo.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import com.example.demo.dto.response.CategoryStatisticsResponse;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {

    @Override
    @Query("""
            SELECT c
            FROM Category c
            WHERE c.id = :id
              AND c.deleted = false
            """)
    Optional<Category> findById(@Param("id") Long id);

    List<Category> findAllByDeletedFalseOrderByIdAsc();

    List<Category> findAllByDeletedTrueOrderByIdAsc();

    List<Category> findAllByDeletedTrueOrderByDeletedAtDesc();

    Optional<Category> findByIdAndDeletedFalse(Long id);

    Optional<Category> findByIdAndDeletedTrue(Long id);

    Optional<Category> findByNameIgnoreCase(String name);

    @Query("""
        SELECT new com.example.demo.dto.response.CategoryStatisticsResponse(
            c.id,
            c.name,
            c.description,
            COUNT(b.id),
            COALESCE(SUM(b.totalQuantity), 0L),
            COALESCE(SUM(b.availableQuantity), 0L)
        )
        FROM Category c
        LEFT JOIN Book b
            ON b.category = c
            AND b.deleted = false
        WHERE c.deleted = false
        GROUP BY c.id, c.name, c.description
        ORDER BY c.id ASC
        """)
    List<CategoryStatisticsResponse> findCategoryStatistics();
    
}