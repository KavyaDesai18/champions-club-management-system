package com.championsclub.social.job;

import com.championsclub.notification.domain.NotificationType;
import com.championsclub.notification.service.NotificationDispatcher;
import com.championsclub.social.domain.SocialParticipantStatus;
import com.championsclub.social.domain.SocialSession;
import com.championsclub.social.domain.SocialSessionStatus;
import com.championsclub.social.repo.SocialParticipantRepository;
import com.championsclub.social.repo.SocialSessionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
public class SocialSessionMaintenanceJobs {

    private static final Logger log = LoggerFactory.getLogger(SocialSessionMaintenanceJobs.class);

    private final SocialSessionRepository sessionRepository;
    private final SocialParticipantRepository participantRepository;
    private final NotificationDispatcher notificationDispatcher;
    private final Clock clock;

    public SocialSessionMaintenanceJobs(
            SocialSessionRepository sessionRepository,
            SocialParticipantRepository participantRepository,
            NotificationDispatcher notificationDispatcher,
            Clock clock
    ) {
        this.sessionRepository = sessionRepository;
        this.participantRepository = participantRepository;
        this.notificationDispatcher = notificationDispatcher;
        this.clock = clock;
    }

    /**
     * Checks upcoming sessions starting within 2 to 3 hours.
     * If joined participants < min_participants, notifies organiser (does not auto-cancel).
     */
    @Scheduled(fixedDelay = 900000) // Every 15 minutes
    @Transactional
    public void checkUnderCapacitySessions() {
        Instant now = clock.instant();
        Instant windowStart = now.plus(2, ChronoUnit.HOURS);
        Instant windowEnd = now.plus(3, ChronoUnit.HOURS);

        List<SocialSession> upcomingSessions = sessionRepository.findUpcomingSessionsInWindow(windowStart, windowEnd);
        for (SocialSession session : upcomingSessions) {
            long joinedCount = participantRepository.countBySessionIdAndStatus(session.getId(), SocialParticipantStatus.JOINED);
            if (joinedCount < session.getMinParticipants()) {
                log.info("Social session '{}' (ID: {}) is below minimum capacity ({} / {} participants). Notifying organiser.",
                        session.getTitle(), session.getId(), joinedCount, session.getMinParticipants());

                if (session.getCreatedBy() != null) {
                    try {
                        notificationDispatcher.dispatch(
                                session.getCreatedBy(),
                                null,
                                "Low Attendance Warning for Social Session",
                                String.format("Session '%s' starting at %s has only %d confirmed participants (minimum %d required).",
                                        session.getTitle(), session.getStartAt(), joinedCount, session.getMinParticipants()),
                                NotificationType.SYSTEM,
                                "{}"
                        );
                    } catch (Exception ex) {
                        log.warn("Failed to dispatch low-capacity notification for session {}: {}", session.getId(), ex.getMessage());
                    }
                }
            }
        }
    }

    /**
     * Auto-completes social sessions that have already concluded.
     */
    @Scheduled(fixedDelay = 600000) // Every 10 minutes
    @Transactional
    public void autoCompletePastSessions() {
        Instant now = clock.instant();
        List<SocialSession> pastSessions = sessionRepository.findPastScheduledSessions(now);
        for (SocialSession session : pastSessions) {
            session.setStatus(SocialSessionStatus.COMPLETED);
            sessionRepository.save(session);
            log.info("Auto-completed social session '{}' (ID: {})", session.getTitle(), session.getId());
        }
    }
}
