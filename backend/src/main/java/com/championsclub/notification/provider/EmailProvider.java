package com.championsclub.notification.provider;

public interface EmailProvider {
    void sendEmail(String toEmail, String subject, String body);
}
