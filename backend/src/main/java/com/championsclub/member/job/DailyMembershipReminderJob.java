package com.championsclub.member.job;

import com.championsclub.common.lock.JobLockService;
import com.championsclub.common.time.ClubTimeUtils;
import com.championsclub.member.domain.Member;
import com.championsclub.member.domain.Membership;
import com.championsclub.member.domain.MembershipReminder;
import com.championsclub.member.domain.ReminderType;
import com.championsclub.member.repo.MembershipReminderRepository;
import com.championsclub.member.repo.MembershipRepository;
import com.championsclub.notification.domain.NotificationType;
import com.championsclub.notification.service.NotificationDispatcher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Component
public class DailyMembershipReminderJob {

    private static final Logger log = LoggerFactory.getLogger(DailyMembershipReminderJob.class);
    public static final String JOB_NAME = "DAILY_MEMBERSHIP_REMINDERS";

    private final MembershipRepository membershipRepository;
    private final MembershipReminderRepository reminderRepository;
    private final JobLockService jobLockService;
    private final NotificationDispatcher notificationDispatcher;
    private final ClubTimeUtils timeUtils;
    private final String instanceId = "inst-" + UUID.randomUUID().toString().substring(0, 8);

    public DailyMembershipReminderJob(
            MembershipRepository membershipRepository,
            MembershipReminderRepository reminderRepository,
            JobLockService jobLockService,
            NotificationDispatcher notificationDispatcher,
            ClubTimeUtils timeUtils
    ) {
        this.membershipRepository = membershipRepository;
        this.reminderRepository = reminderRepository;
        this.jobLockService = jobLockService;
        this.notificationDispatcher = notificationDispatcher;
        this.timeUtils = timeUtils;
    }

    /**
     * Executes daily at 08:00 AM club time.
     * DB-locked so multi-instance safe. Fully idempotent with deduplication per (member, membership, type).
     */
    @Scheduled(cron = "0 0 8 * * ?", zone = "Asia/Kolkata")
    public int executeDailyReminders() {
        long startTime = System.currentTimeMillis();
        boolean locked = jobLockService.acquireLock(JOB_NAME, instanceId, Duration.ofMinutes(15));
        if (!locked) {
            log.info("[Job: {}] Lock acquisition skipped; another instance holds the lock.", JOB_NAME);
            return 0;
        }

        try {
            int sentCount = runReminderProcess();
            long duration = System.currentTimeMillis() - startTime;
            jobLockService.recordSuccess(JOB_NAME, instanceId, duration);
            log.info("[Job: {}] Processed {} reminder dispatches in {} ms", JOB_NAME, sentCount, duration);
            return sentCount;
        } catch (Exception ex) {
            log.error("[Job: {}] Failed during execution: {}", JOB_NAME, ex.getMessage(), ex);
            jobLockService.recordFailure(JOB_NAME, instanceId);
            throw ex;
        }
    }

    @Transactional
    public int runReminderProcess() {
        LocalDate today = timeUtils.currentClubDate();
        // Look for active memberships expiring within next 35 days (covers catch-up + 30-day milestone)
        LocalDate maxEndDate = today.plusDays(35);
        List<Membership> activeCandidates = membershipRepository.findActiveExpiringBetween(today, maxEndDate);

        int sentCount = 0;
        for (Membership m : activeCandidates) {
            Member member = m.getMember();
            if (member == null) continue;

            long daysLeft = ChronoUnit.DAYS.between(today, m.getEndDate());

            // 1. 30-day milestone (30 days or less remaining)
            if (daysLeft <= 30 && daysLeft > 7) {
                if (dispatchReminderIfUnsent(member, m, ReminderType.EXPIRY_30_DAYS,
                        "Membership Expiry: 30 Days Remaining",
                        String.format("Hello %s, your %s membership expires in %d days on %s. Renew early to retain your member rate perks!",
                                member.getFullName(), m.getPlan() != null ? m.getPlan().getName() : "Club", daysLeft, m.getEndDate()))) {
                    sentCount++;
                }
            }

            // 2. 7-day milestone (7 days or less remaining)
            if (daysLeft <= 7 && daysLeft > 1) {
                if (dispatchReminderIfUnsent(member, m, ReminderType.EXPIRY_7_DAYS,
                        "Membership Expiry: 7 Days Remaining",
                        String.format("Important: Only %d days remaining on your %s membership (expires %s). Renew online or at the front desk.",
                                daysLeft, m.getPlan() != null ? m.getPlan().getName() : "Club", m.getEndDate()))) {
                    sentCount++;
                }
            }

            // 3. 1-day milestone (1 day remaining)
            if (daysLeft == 1) {
                if (dispatchReminderIfUnsent(member, m, ReminderType.EXPIRY_1_DAY,
                        "Urgent: Membership Expires Tomorrow!",
                        String.format("Hello %s, your %s membership expires tomorrow (%s). Renew now to prevent interruption to your booking privileges.",
                                member.getFullName(), m.getPlan() != null ? m.getPlan().getName() : "Club", m.getEndDate()))) {
                    sentCount++;
                }
            }

            // 4. Expiry day milestone (0 days remaining: today == endDate)
            if (daysLeft == 0) {
                if (dispatchReminderIfUnsent(member, m, ReminderType.EXPIRY_TODAY,
                        "Action Required: Membership Expires Today!",
                        String.format("Hello %s, your %s membership expires today (%s). Renew today to avoid losing member court rates.",
                                member.getFullName(), m.getPlan() != null ? m.getPlan().getName() : "Club", m.getEndDate()))) {
                    sentCount++;
                }
            }
        }

        return sentCount;
    }

    private boolean dispatchReminderIfUnsent(
            Member member,
            Membership membership,
            ReminderType reminderType,
            String title,
            String message
    ) {
        // Enforce rule: never send the same reminder twice (unique key member + membership + type)
        if (reminderRepository.existsByMemberIdAndMembershipIdAndReminderType(member.getId(), membership.getId(), reminderType)) {
            return false;
        }

        try {
            // Save deduplication record first to protect against race conditions
            MembershipReminder reminder = MembershipReminder.builder()
                    .member(member)
                    .membership(membership)
                    .reminderType(reminderType)
                    .sentAt(timeUtils.now())
                    .status("SENT")
                    .build();
            reminderRepository.saveAndFlush(reminder);

            // Dispatch notification (IN_APP + EMAIL + SMS with graceful fallbacks)
            notificationDispatcher.dispatch(
                    member.getUser(),
                    member,
                    title,
                    message,
                    NotificationType.MEMBERSHIP_EXPIRY,
                    "{\"reminderType\":\"" + reminderType.name() + "\",\"endDate\":\"" + membership.getEndDate() + "\"}"
            );

            log.info("Dispatched {} reminder for member {} (membership {})", reminderType, member.getMemberNo(), membership.getId());
            return true;
        } catch (Exception ex) {
            log.error("Failed to send {} reminder for member {}: {}", reminderType, member.getMemberNo(), ex.getMessage());
            return false;
        }
    }
}
