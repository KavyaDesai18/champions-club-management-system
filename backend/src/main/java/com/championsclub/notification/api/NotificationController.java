package com.championsclub.notification.api;

import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.UserRepository;
import com.championsclub.notification.domain.Notification;
import com.championsclub.notification.domain.NotificationPreference;
import com.championsclub.notification.dto.NotificationDto;
import com.championsclub.notification.dto.NotificationPreferenceDto;
import com.championsclub.notification.repo.NotificationPreferenceRepository;
import com.championsclub.notification.repo.NotificationRepository;
import com.championsclub.notification.service.SseNotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.Clock;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@Tag(name = "Notifications & Real-time Alerts", description = "In-app notifications, preferences, and real-time SSE stream")
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final NotificationPreferenceRepository preferenceRepository;
    private final UserRepository userRepository;
    private final SseNotificationService sseNotificationService;
    private final Clock clock;

    public NotificationController(
            NotificationRepository notificationRepository,
            NotificationPreferenceRepository preferenceRepository,
            UserRepository userRepository,
            SseNotificationService sseNotificationService,
            Clock clock
    ) {
        this.notificationRepository = notificationRepository;
        this.preferenceRepository = preferenceRepository;
        this.userRepository = userRepository;
        this.sseNotificationService = sseNotificationService;
        this.clock = clock;
    }

    @GetMapping("/mine")
    @Operation(summary = "List my notifications", description = "Paginated list of notifications for the authenticated user")
    public ResponseEntity<Page<NotificationDto>> listMine(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            Authentication auth
    ) {
        User user = resolveUser(auth);
        Page<Notification> paged = notificationRepository.findForUser(
                user.getId(),
                unreadOnly,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))
        );
        return ResponseEntity.ok(paged.map(NotificationDto::fromEntity));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Get unread count", description = "Returns the count of unread notifications")
    public ResponseEntity<Map<String, Long>> getUnreadCount(Authentication auth) {
        User user = resolveUser(auth);
        long count = notificationRepository.countUnreadForUser(user.getId());
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    @PatchMapping("/{id}/read")
    @Transactional
    @Operation(summary = "Mark notification as read", description = "Marks a specific notification as read")
    public ResponseEntity<NotificationDto> markRead(
            @PathVariable UUID id,
            Authentication auth
    ) {
        User user = resolveUser(auth);
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", id));

        notification.setRead(true);
        notification.setReadAt(clock.instant());
        notification = notificationRepository.save(notification);

        long unread = notificationRepository.countUnreadForUser(user.getId());
        sseNotificationService.pushUnreadCount(user.getId(), unread);

        return ResponseEntity.ok(NotificationDto.fromEntity(notification));
    }

    @PostMapping("/mark-all-read")
    @Transactional
    @Operation(summary = "Mark all notifications read", description = "Marks all unread notifications as read for current user")
    public ResponseEntity<Map<String, Object>> markAllRead(Authentication auth) {
        User user = resolveUser(auth);
        int updated = notificationRepository.markAllReadForUser(user.getId(), clock.instant());
        sseNotificationService.pushUnreadCount(user.getId(), 0L);
        return ResponseEntity.ok(Map.of("success", true, "markedCount", updated));
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Real-time notification stream (SSE)", description = "Server-Sent Events connection for instant notification popups and unread count")
    public SseEmitter stream(Authentication auth) {
        User user = resolveUser(auth);
        return sseNotificationService.subscribe(user.getId());
    }

    @GetMapping("/preferences")
    @Operation(summary = "Get notification preferences", description = "Get preferences for email, sms, in-app, expiry reminders")
    public ResponseEntity<NotificationPreferenceDto> getPreferences(Authentication auth) {
        User user = resolveUser(auth);
        NotificationPreference prefs = preferenceRepository.findByUserId(user.getId())
                .orElseGet(() -> NotificationPreference.builder().user(user).build());
        return ResponseEntity.ok(NotificationPreferenceDto.fromEntity(prefs));
    }

    @PutMapping("/preferences")
    @Transactional
    @Operation(summary = "Update notification preferences")
    public ResponseEntity<NotificationPreferenceDto> updatePreferences(
            @RequestBody NotificationPreferenceDto dto,
            Authentication auth
    ) {
        User user = resolveUser(auth);
        NotificationPreference prefs = preferenceRepository.findByUserId(user.getId())
                .orElseGet(() -> NotificationPreference.builder().user(user).build());

        prefs.setEmailEnabled(dto.isEmailEnabled());
        prefs.setSmsEnabled(dto.isSmsEnabled());
        prefs.setInAppEnabled(dto.isInAppEnabled());
        prefs.setExpiryReminders(dto.isExpiryReminders());
        prefs.setBookingUpdates(dto.isBookingUpdates());
        prefs.setMarketingPromos(dto.isMarketingPromos());
        prefs.setUpdatedAt(clock.instant());

        prefs = preferenceRepository.save(prefs);
        return ResponseEntity.ok(NotificationPreferenceDto.fromEntity(prefs));
    }

    private User resolveUser(Authentication auth) {
        if (auth == null || auth.getName() == null) {
            throw new ResourceNotFoundException("User authentication required", "AUTH_REQUIRED");
        }
        return userRepository.findByEmailAndIsDeletedFalse(auth.getName().trim().toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException("User not found for authenticated principal: " + auth.getName(), "USER_NOT_FOUND"));
    }
}
