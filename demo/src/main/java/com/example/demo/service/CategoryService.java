package com.example.demo.service;

import com.example.demo.entity.Category;
import com.example.demo.repository.BookRepository;
import com.example.demo.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.demo.dto.response.CategoryStatisticsResponse;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final BookRepository bookRepository;

    @Transactional(readOnly = true)
    public List<Category> getAllCategories() {
        return categoryRepository.findAllByDeletedFalseOrderByIdAsc();
   }

    @Transactional(readOnly = true)
    public List<Category> getDeletedCategories() {
        return categoryRepository.findAllByDeletedTrueOrderByIdAsc();
  }

    @Transactional(readOnly = true)
    public Category getCategoryById(Long id) {
        return categoryRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() ->
                        new IllegalArgumentException("Không tìm thấy danh mục.")
                );
    }

    @Transactional
    public Category createCategory(Category request) {
        String name = normalizeName(request.getName());
        validateUniqueName(name, null);

        Category category = new Category();
        category.setName(name);
        category.setDescription(normalizeDescription(request.getDescription()));
        category.setDeleted(false);
        category.setDeletedAt(null);

        return categoryRepository.save(category);
    }

    @Transactional
    public Category updateCategory(Long id, Category request) {
        Category category = categoryRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() ->
                        new IllegalArgumentException("Không tìm thấy danh mục.")
                );

        String name = normalizeName(request.getName());
        validateUniqueName(name, id);

        category.setName(name);
        category.setDescription(normalizeDescription(request.getDescription()));

        return categoryRepository.save(category);
    }

    @Transactional
    public void deleteCategory(Long id) {
        Category category = categoryRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() ->
                        new IllegalArgumentException("Không tìm thấy danh mục.")
                );

        category.setDeleted(true);
        category.setDeletedAt(LocalDateTime.now());
        categoryRepository.save(category);
    }

    @Transactional
    public Category restoreCategory(Long id) {
        Category category = categoryRepository.findByIdAndDeletedTrue(id)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Không tìm thấy danh mục trong thùng rác."
                        )
                );

        categoryRepository.findByNameIgnoreCase(category.getName())
                .filter(existing -> !existing.getId().equals(id)
                        && !existing.isDeleted())
                .ifPresent(existing -> {
                    throw new IllegalArgumentException(
                            "Không thể khôi phục vì tên danh mục đã được sử dụng."
                    );
                });

        category.setDeleted(false);
        category.setDeletedAt(null);

        return categoryRepository.save(category);
    }

    @Transactional
    public void permanentlyDeleteCategory(Long id) {
        Category category = categoryRepository.findByIdAndDeletedTrue(id)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Chỉ có thể xóa vĩnh viễn danh mục trong thùng rác."
                        )
                );

        if (bookRepository.existsByCategory_Id(id)) {
            throw new IllegalArgumentException(
                    "Không thể xóa vĩnh viễn vì vẫn còn sách tham chiếu danh mục này. "
                            + "Hãy chuyển sách sang danh mục khác trước."
            );
        }

        categoryRepository.delete(category);
    }

    private String normalizeName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException(
                    "Tên danh mục không được để trống."
            );
        }

        String normalized = name.trim();

        if (normalized.length() > 255) {
            throw new IllegalArgumentException(
                    "Tên danh mục không được vượt quá 255 ký tự."
            );
        }

        return normalized;
    }

    private String normalizeDescription(String description) {
        if (description == null || description.isBlank()) {
            return null;
        }

        String normalized = description.trim();

        if (normalized.length() > 500) {
            throw new IllegalArgumentException(
                    "Mô tả danh mục không được vượt quá 500 ký tự."
            );
        }

        return normalized;
    }

    private void validateUniqueName(String name, Long excludedId) {
        categoryRepository.findByNameIgnoreCase(name)
                .filter(existing -> excludedId == null
                        || !existing.getId().equals(excludedId))
                .ifPresent(existing -> {
                    if (existing.isDeleted()) {
                        throw new IllegalArgumentException(
                                "Tên danh mục này thuộc danh mục đã xóa. "
                                        + "Không thể tạo danh mục trùng tên."
                        );
                    }

                    throw new IllegalArgumentException(
                            "Tên danh mục đã tồn tại."
                    );
                });
    }

    @Transactional(readOnly = true)
    public List<CategoryStatisticsResponse> getCategoryStatistics() {
        return categoryRepository.findCategoryStatistics();
    }
}