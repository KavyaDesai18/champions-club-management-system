package com.championsclub.notification.provider;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnMissingBean(name = "customSmsProvider")
public class LoggingSmsProvider implements SmsProvider {

    private static final Logger log = LoggerFactory.getLogger(LoggingSmsProvider.class);

    @Override
    public void sendSms(String toPhone, String message) {
        log.info("[SMS-STUB] Dispatched SMS to: <{}> | Message: {}", toPhone, message);
    }
}
