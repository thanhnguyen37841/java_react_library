
package com.example.demo.util;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;

public class DateUtils {

    public static final String DATE_FORMAT = "yyyy/MM/dd";

    private static final DateTimeFormatter SLASH_FORMATTER =
            DateTimeFormatter.ofPattern("uuuu/MM/dd")
                    .withResolverStyle(ResolverStyle.STRICT);

    private static final DateTimeFormatter ISO_FORMATTER =
            DateTimeFormatter.ofPattern("uuuu-MM-dd")
                    .withResolverStyle(ResolverStyle.STRICT);

    private DateUtils() {
        // Utility class
    }

    /**
     * Kiểm tra định dạng ngày:
     * - yyyy/MM/dd
     * - yyyy-MM-dd
     *
     * Null hoặc chuỗi rỗng được bỏ qua để các annotation
     * @NotBlank / @NotNull xử lý riêng.
     */
    public static boolean isValidFormat(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            return true;
        }

        String value = dateStr.trim();

        try {
            parseDate(value);
            return true;
        } catch (DateTimeParseException e) {
            return false;
        }
    }

    /**
     * Chuyển chuỗi ngày sang LocalDate.
     * Hỗ trợ cả định dạng từ frontend và định dạng cũ.
     */
    public static LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            return null;
        }

        String value = dateStr.trim();

        try {
            if (value.matches("\\d{4}-\\d{2}-\\d{2}")) {
                return LocalDate.parse(value, ISO_FORMATTER);
            }

            if (value.matches("\\d{4}/\\d{2}/\\d{2}")) {
                return LocalDate.parse(value, SLASH_FORMATTER);
            }

            throw new DateTimeParseException(
                    "Ngày không đúng định dạng yyyy/MM/dd hoặc yyyy-MM-dd",
                    value,
                    0
            );

        } catch (DateTimeParseException e) {
            throw e;
        }
    }
}
