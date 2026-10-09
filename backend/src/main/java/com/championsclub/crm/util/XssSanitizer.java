package com.championsclub.crm.util;

import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

@Component
public class XssSanitizer {

    private static final Pattern SCRIPT_PATTERN = Pattern.compile("<script>(.*?)</script>", Pattern.CASE_INSENSITIVE);
    private static final Pattern SRC_PATTERN = Pattern.compile("src[\r\n]*=[\r\n]*\\\'(.*?)\\\'", Pattern.CASE_INSENSITIVE | Pattern.MULTILINE | Pattern.DOTALL);
    private static final Pattern ON_EVENT_PATTERN = Pattern.compile("on\\w+\\s*=", Pattern.CASE_INSENSITIVE);
    private static final Pattern JAVASCRIPT_PATTERN = Pattern.compile("javascript:", Pattern.CASE_INSENSITIVE);

    public String sanitize(String input) {
        if (input == null) {
            return null;
        }
        String cleaned = input;
        cleaned = SCRIPT_PATTERN.matcher(cleaned).replaceAll("");
        cleaned = SRC_PATTERN.matcher(cleaned).replaceAll("");
        cleaned = ON_EVENT_PATTERN.matcher(cleaned).replaceAll("");
        cleaned = JAVASCRIPT_PATTERN.matcher(cleaned).replaceAll("");
        
        // Basic HTML entity encoding for safety
        return cleaned.replace("<", "&lt;")
                      .replace(">", "&gt;");
    }
}
