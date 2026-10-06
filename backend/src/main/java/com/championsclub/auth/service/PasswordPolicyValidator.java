package com.championsclub.auth.service;

import com.championsclub.common.error.BusinessValidationException;
import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

@Component
public class PasswordPolicyValidator {

    // Policy: Minimum 8 characters, at least one letter and at least one digit
    private static final Pattern PASSWORD_PATTERN = Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d).{8,}$");

    public void validate(String password) {
        if (password == null || !PASSWORD_PATTERN.matcher(password).matches()) {
            throw new BusinessValidationException(
                    "Password must be at least 8 characters long and contain both letters and numbers."
            );
        }
    }
}
