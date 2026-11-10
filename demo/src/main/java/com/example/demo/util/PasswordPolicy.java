
package com.example.demo.util;

import java.util.regex.Pattern;

public final class PasswordPolicy {

    private static final Pattern PASSWORD_PATTERN = Pattern.compile(
            "^(?=\\S{12,}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)"
                    + "(?=.*[^a-zA-Z0-9\\s]).*$"
    );

    private PasswordPolicy() {
    }

    public static void validate(String password, String confirmPassword) {
        if (password == null || !PASSWORD_PATTERN.matcher(password).matches()) {
            throw new IllegalArgumentException(getErrorMessage());
        }

        if (confirmPassword == null || !password.equals(confirmPassword)) {
            throw new IllegalArgumentException(
                    "Mật khẩu xác nhận không khớp."
            );
        }
    }

    public static String getErrorMessage() {
        return "Mật khẩu phải có ít nhất 12 ký tự, gồm chữ hoa, "
                + "chữ thường, chữ số và ký tự đặc biệt; "
                + "không chứa khoảng trắng.";
    }
}
