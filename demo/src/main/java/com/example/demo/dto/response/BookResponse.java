
package com.example.demo.dto.response;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BookResponse {

    private Long id;

    private String title;

    private String author;

    private String isbn;

    private String edition;

    private Integer totalQuantity;

    private Integer availableQuantity;

    private Long categoryId;

    private String categoryName;

    private String coverImageUrl;

    private String description;

    private String publisher;

    private Integer publicationYear;

    private String language;

    private Integer pageCount;

    /**
     * Cho biết sách có tệp ebook để đọc trực tuyến hay không.
     */
    private boolean hasEbook;
}
