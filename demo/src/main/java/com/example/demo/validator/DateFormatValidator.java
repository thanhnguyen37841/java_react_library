package com.example.demo.validator;

import com.example.demo.util.DateUtils;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class DateFormatValidator implements ConstraintValidator<ValidDateFormat, String> {
    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        return DateUtils.isValidFormat(value);
    }
}