
package com.example.demo.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BookRequest {

    @NotBlank(message = "Tiêu đề không được để trống")
    @Size(max = 255, message = "Tiêu đề không được vượt quá 255 ký tự")
    private String title;

    @NotBlank(message = "Tên tác giả không được để trống")
    @Size(max = 255, message = "Tên tác giả không được vượt quá 255 ký tự")
    private String author;

    @Size(max = 20, message = "ISBN không được vượt quá 20 ký tự")
    @Pattern(
        regexp = "^$|^(?:[0-9]{9}[0-9Xx]|[0-9]{13})$",
        message = "ISBN phải có định dạng ISBN-10 hoặc ISBN-13"
    )
    private String isbn;

    @Size(max = 100, message = "Phiên bản không được vượt quá 100 ký tự")
    private String edition;

    @NotNull(message = "Số lượng không được để trống")
    @Min(value = 1, message = "Số lượng tối thiểu là 1")
    private Integer totalQuantity;

    @NotNull(message = "ID Danh mục không được để trống")
    @Min(value = 1, message = "ID Danh mục phải lớn hơn 0")
    private Long categoryId;

    @Size(max = 1000, message = "URL ảnh bìa không được vượt quá 1000 ký tự")
    @Pattern(
        regexp = "^$|^https?://.+$",
        message = "URL ảnh bìa phải bắt đầu bằng http:// hoặc https://"
    )
    private String coverImageUrl;

    @Size(max = 10000, message = "Mô tả sách không được vượt quá 10000 ký tự")
    private String description;

    @Size(max = 255, message = "Tên nhà xuất bản không được vượt quá 255 ký tự")
    private String publisher;

    @Min(value = 1000, message = "Năm xuất bản không hợp lệ")
    @Max(value = 2100, message = "Năm xuất bản không hợp lệ")
    private Integer publicationYear;

    @Size(max = 100, message = "Ngôn ngữ không được vượt quá 100 ký tự")
    private String language;

    @Min(value = 1, message = "Số trang phải lớn hơn 0")
    @Max(value = 100000, message = "Số trang không hợp lệ")
    private Integer pageCount;
}
