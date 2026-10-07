package com.championsclub.notification.service;

import com.championsclub.member.domain.Member;
import com.championsclub.member.domain.User;
import com.championsclub.notification.domain.Notification;
import com.championsclub.notification.domain.NotificationChannel;
import com.championsclub.notification.domain.NotificationPreference;
import com.championsclub.notification.domain.NotificationType;
import com.championsclub.notification.provider.EmailProvider;
import com.championsclub.notification.provider.SmsProvider;
import com.championsclub.notification.repo.NotificationPreferenceRepository;
import com.championsclub.notification.repo.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.Optional;
import java.util.UUID;

@Service
public class NotificationDispatcher {

    private static final Logger log = LoggerFactory.getLogger(NotificationDispatcher.class);
    private static final int MAX_PROVIDER_RETRIES = 3;
    private static final long INITIAL_BACKOFF_MS = 50L;

    private final NotificationRepository notificationRepository;
    private final NotificationPreferenceRepository preferenceRepository;
    private final EmailProvider emailProvider;
    private final SmsProvider smsProvider;
    private final SseNotificationService sseNotificationService;
    private final Clock clock;

    public NotificationDispatcher(
            NotificationRepository notificationRepository,
            NotificationPreferenceRepository preferenceRepository,
            EmailProvider emailProvider,
            SmsProvider smsProvider,
            SseNotificationService sseNotificationService,
            Clock clock
    ) {
        this.notificationRepository = notificationRepository;
        this.preferenceRepository = preferenceRepository;
        this.emailProvider = emailProvider;
        this.smsProvider = smsProvider;
        this.sseNotificationService = sseNotificationService;
        this.clock = clock;
    }

    @Transactional
    public Notification dispatch(
            User user,
            Member member,
            String title,
            String message,
            NotificationType type,
            String metadataJson
    ) {
        UUID userId = user != null ? user.getId() : (member != null && member.getUser() != null ? member.getUser().getId() : null);
        String recipientEmail = user != null ? user.getEmail() : (member != null ? member.getEmail() : null);
        String recipientPhone = user != null ? user.getPhone() : (member != null ? member.getPhone() : null);

        NotificationPreference prefs = userId != null
                ? preferenceRepository.findByUserId(userId).orElse(null)
                : null;

        // 1. Always create and persist the In-App notification
        Notification inAppNotification = Notification.builder()
                .user(user != null ? user : (member != null ? member.getUser() : null))
                .member(member)
                .title(title)
                .message(message)
                .type(type)
                .channel(NotificationChannel.IN_APP)
                .read(false)
                .metadataJson(metadataJson)
                .createdAt(clock.instant())
                .deliveryStatus("DELIVERED")
                .retryCount(0)
                .build();

        inAppNotification = notificationRepository.save(inAppNotification);

        // SSE Push for in-app alert
        if (userId != null) {
            sseNotificationService.pushNotification(userId, inAppNotification);
            long unread = notificationRepository.countUnreadForUser(userId);
            sseNotificationService.pushUnreadCount(userId, unread);
        }

        // 2. Email dispatch with retry & backoff
        boolean emailEnabled = prefs == null || (prefs.isEmailEnabled() && (type != NotificationType.MEMBERSHIP_EXPIRY || prefs.isExpiryReminders()));
        if (emailEnabled) {
            if (recipientEmail != null && !recipientEmail.isBlank()) {
                dispatchEmailWithRetry(recipientEmail, title, message);
            } else {
                log.info("Skipping email dispatch: No email available for member/user {}", member != null ? member.getMemberNo() : userId);
            }
        }

        // 3. SMS dispatch with retry & backoff
        boolean smsEnabled = prefs == null || (prefs.isSmsEnabled() && (type != NotificationType.MEMBERSHIP_EXPIRY || prefs.isExpiryReminders()));
        if (smsEnabled) {
            if (recipientPhone != null && !recipientPhone.isBlank()) {
                dispatchSmsWithRetry(recipientPhone, message);
            } else {
                log.info("Skipping SMS dispatch: No phone available for member/user {}", member != null ? member.getMemberNo() : userId);
            }
        }

        return inAppNotification;
    }

    private void dispatchEmailWithRetry(String toEmail, String subject, String body) {
        int attempt = 0;
        long backoff = INITIAL_BACKOFF_MS;
        while (attempt < MAX_PROVIDER_RETRIES) {
            attempt++;
            try {
                emailProvider.sendEmail(toEmail, subject, body);
                return;
            } catch (Exception ex) {
                log.warn("EmailProvider failed (attempt {}/{}): {}", attempt, MAX_PROVIDER_RETRIES, ex.getMessage());
                if (attempt < MAX_PROVIDER_RETRIES) {
                    try {
                        Thread.sleep(backoff);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                    backoff *= 2;
                } else {
                    log.error("EmailProvider failed after {} attempts for <{}>. Non-blocking error.", MAX_PROVIDER_RETRIES, toEmail, ex);
                }
            }
        }
    }

    private void dispatchSmsWithRetry(String toPhone, String message) {
        int attempt = 0;
        long backoff = INITIAL_BACKOFF_MS;
        while (attempt < MAX_PROVIDER_RETRIES) {
            attempt++;
            try {
                smsProvider.sendSms(toPhone, message);
                return;
            } catch (Exception ex) {
                log.warn("SmsProvider failed (attempt {}/{}): {}", attempt, MAX_PROVIDER_RETRIES, ex.getMessage());
                if (attempt < MAX_PROVIDER_RETRIES) {
                    try {
                        Thread.sleep(backoff);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                    backoff *= 2;
                } else {
                    log.error("SmsProvider failed after {} attempts for <{}>. Non-blocking error.", MAX_PROVIDER_RETRIES, toPhone, ex);
                }
            }
        }
    }
}
