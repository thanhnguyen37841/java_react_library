
package com.example.demo.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BorrowRequest {

    @NotNull(message = "ID độc giả không được để trống")
    private Long memberId;

    @NotNull(message = "ID của Sách không được để trống")
    private Long bookId;
}
