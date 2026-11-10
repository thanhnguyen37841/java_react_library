package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MemberProfileRequest {

    @NotBlank(message = "Họ và tên là bắt buộc")
    @Size(max = 100, message = "Họ tên không được vượt quá 100 ký tự")
    private String fullName;

    @NotBlank(message = "Ngày sinh là bắt buộc")
    @Pattern(
        regexp = "^\\d{4}/\\d{2}/\\d{2}$",
        message = "Ngày sinh phải có định dạng yyyy/MM/dd"
    )
    private String dateOfBirth;

    @NotBlank(message = "Số điện thoại là bắt buộc")
    @Pattern(
        regexp = "^(0\\d{9}|\\+84\\d{9})$",
        message = "Số điện thoại phải gồm 10 chữ số bắt đầu bằng 0 hoặc mã quốc gia +84"
    )
    @Size(max = 20, message = "Số điện thoại không được vượt quá 20 ký tự")
    private String phoneNumber;

    @NotBlank(message = "Địa chỉ là bắt buộc")
    @Size(max = 255, message = "Địa chỉ hoàn chỉnh không được vượt quá 255 ký tự")
    private String address;
}