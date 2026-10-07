package com.championsclub.notification.provider;

public interface SmsProvider {
    void sendSms(String toPhone, String message);
}
