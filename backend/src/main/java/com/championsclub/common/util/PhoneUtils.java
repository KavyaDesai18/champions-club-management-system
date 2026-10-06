package com.championsclub.common.util;

import java.math.BigDecimal;
import java.util.regex.Pattern;

public final class PhoneUtils {

    private static final Pattern SCIENTIFIC_NOTATION = Pattern.compile("^[0-9]+(\\.[0-9]+)?[eE]\\+[0-9]+$");

    private PhoneUtils() {}

    public static String normalizePhone(String rawPhone) {
        if (rawPhone == null || rawPhone.isBlank()) {
            return "";
        }

        String cleaned = rawPhone.trim();

        // Handle Excel scientific notation: e.g. "9.87654321E+09" or "9.87654321e+9"
        if (SCIENTIFIC_NOTATION.matcher(cleaned).matches()) {
            try {
                cleaned = new BigDecimal(cleaned).toBigInteger().toString();
            } catch (Exception ignored) {
            }
        }

        boolean hasPlus = cleaned.startsWith("+");

        // Strip non-digits
        String digitsOnly = cleaned.replaceAll("[^0-9]", "");
        if (digitsOnly.isEmpty()) {
            return rawPhone.trim();
        }

        // Standard Indian / International phone normalization
        if (hasPlus) {
            return "+" + digitsOnly;
        }

        // If 10 digits standard mobile number, prefix +91
        if (digitsOnly.length() == 10) {
            return "+91" + digitsOnly;
        }

        // If 11 digits starting with 0, replace 0 with +91
        if (digitsOnly.length() == 11 && digitsOnly.startsWith("0")) {
            return "+91" + digitsOnly.substring(1);
        }

        // If 12 digits starting with 91, prepend +
        if (digitsOnly.length() == 12 && digitsOnly.startsWith("91")) {
            return "+" + digitsOnly;
        }

        // Fallback: prefix + to normalized digits
        return "+" + digitsOnly;
    }
}
