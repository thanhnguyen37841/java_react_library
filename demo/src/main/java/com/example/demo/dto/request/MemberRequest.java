
package com.example.demo.dto.request;

import com.example.demo.validator.ValidDateFormat;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class MemberRequest {

    @NotBlank(message = "Họ tên không được để trống")
    @Size(max = 100, message = "Họ tên không được vượt quá 100 ký tự")
    private String fullName;

    @ValidDateFormat
    @NotBlank(message = "Ngày sinh không được để trống")
    private String dateOfBirth;

    @NotBlank(message = "Số điện thoại không được để trống")
    @Pattern(
            regexp = "^(0\\d{9}|\\+84\\d{9})$",
            message = "Số điện thoại phải có dạng 0xxxxxxxxx hoặc +84xxxxxxxxx"
    )
    private String phoneNumber;

    @NotBlank(message = "Địa chỉ không được để trống")
    @Size(
            max = 255,
            message = "Địa chỉ không được vượt quá 255 ký tự"
    )
    private String address;

    // Không bắt buộc ở DTO vì khi cập nhật không thay đổi User liên kết.
    // Khi tạo mới, MemberService sẽ tự kiểm tra userId.
    private Long userId;
}
