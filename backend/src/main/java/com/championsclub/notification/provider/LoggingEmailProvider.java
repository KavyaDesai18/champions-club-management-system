package com.championsclub.notification.provider;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnMissingBean(name = "customEmailProvider")
public class LoggingEmailProvider implements EmailProvider {

    private static final Logger log = LoggerFactory.getLogger(LoggingEmailProvider.class);

    @Override
    public void sendEmail(String toEmail, String subject, String body) {
        log.info("[EMAIL-STUB] Dispatched email to: <{}> | Subject: '{}' | Content: {}", toEmail, subject, body);
    }
}
