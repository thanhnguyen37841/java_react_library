
package com.example.demo.mapper;

import com.example.demo.dto.request.BookRequest;
import com.example.demo.dto.response.BookResponse;
import com.example.demo.entity.Book;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface BookMapper {

    @Mapping(source = "category.id", target = "categoryId")
    @Mapping(source = "category.name", target = "categoryName")
    @Mapping(
        target = "hasEbook",
        expression = "java(book.getEbookFilePath() != null && !book.getEbookFilePath().isBlank())"
    )
    BookResponse toResponse(Book book);

    @Mapping(target = "category", ignore = true)
    @Mapping(target = "availableQuantity", source = "totalQuantity")
    Book toEntity(BookRequest request);

    @Mapping(target = "category", ignore = true)
    @Mapping(target = "availableQuantity", ignore = true)
    void updateEntity(
            @MappingTarget Book book,
            BookRequest request
    );
}
