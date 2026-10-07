package com.championsclub.member.job;

import com.championsclub.common.lock.JobLockService;
import com.championsclub.common.time.ClubTimeUtils;
import com.championsclub.member.domain.Member;
import com.championsclub.member.domain.MemberStatus;
import com.championsclub.member.domain.Membership;
import com.championsclub.member.domain.MembershipEvent;
import com.championsclub.member.domain.MembershipEventType;
import com.championsclub.member.domain.MembershipReminder;
import com.championsclub.member.domain.MembershipStatus;
import com.championsclub.member.domain.ReminderType;
import com.championsclub.member.repo.MemberRepository;
import com.championsclub.member.repo.MembershipEventRepository;
import com.championsclub.member.repo.MembershipReminderRepository;
import com.championsclub.member.repo.MembershipRepository;
import com.championsclub.notification.domain.NotificationType;
import com.championsclub.notification.service.NotificationDispatcher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Component
public class DailyMembershipExpiryJob {

    private static final Logger log = LoggerFactory.getLogger(DailyMembershipExpiryJob.class);
    public static final String JOB_NAME = "DAILY_MEMBERSHIP_EXPIRY";

    private final MembershipRepository membershipRepository;
    private final MemberRepository memberRepository;
    private final MembershipEventRepository eventRepository;
    private final MembershipReminderRepository reminderRepository;
    private final JobLockService jobLockService;
    private final NotificationDispatcher notificationDispatcher;
    private final ClubTimeUtils timeUtils;
    private final int gracePeriodDays;
    private final String instanceId = "inst-" + UUID.randomUUID().toString().substring(0, 8);

    public DailyMembershipExpiryJob(
            MembershipRepository membershipRepository,
            MemberRepository memberRepository,
            MembershipEventRepository eventRepository,
            MembershipReminderRepository reminderRepository,
            JobLockService jobLockService,
            NotificationDispatcher notificationDispatcher,
            ClubTimeUtils timeUtils,
            @Value("${app.membership.grace-period-days:0}") int gracePeriodDays
    ) {
        this.membershipRepository = membershipRepository;
        this.memberRepository = memberRepository;
        this.eventRepository = eventRepository;
        this.reminderRepository = reminderRepository;
        this.jobLockService = jobLockService;
        this.notificationDispatcher = notificationDispatcher;
        this.timeUtils = timeUtils;
        this.gracePeriodDays = gracePeriodDays;
    }

    /**
     * Executes daily at 00:01 AM club time.
     * DB-locked so multi-instance safe. Fully idempotent and supports multi-day catch up.
     */
    @Scheduled(cron = "0 1 0 * * ?", zone = "Asia/Kolkata")
    public int executeDailyExpiry() {
        long startTime = System.currentTimeMillis();
        boolean locked = jobLockService.acquireLock(JOB_NAME, instanceId, Duration.ofMinutes(15));
        if (!locked) {
            log.info("[Job: {}] Lock acquisition skipped; another instance holds the lock.", JOB_NAME);
            return 0;
        }

        try {
            int expiredCount = runExpiryProcess();
            long duration = System.currentTimeMillis() - startTime;
            jobLockService.recordSuccess(JOB_NAME, instanceId, duration);
            log.info("[Job: {}] Successfully expired {} memberships in {} ms", JOB_NAME, expiredCount, duration);
            return expiredCount;
        } catch (Exception ex) {
            log.error("[Job: {}] Failed during execution: {}", JOB_NAME, ex.getMessage(), ex);
            jobLockService.recordFailure(JOB_NAME, instanceId);
            throw ex;
        }
    }

    @Transactional
    public int runExpiryProcess() {
        LocalDate today = timeUtils.currentClubDate();
        // Cutoff: an active membership is expired if its end date plus grace period has passed (i.e. endDate < today - gracePeriod)
        LocalDate cutoffDate = today.minusDays(gracePeriodDays);

        List<Membership> toExpire = membershipRepository.findActiveExpiredBefore(cutoffDate);
        log.info("[Job: {}] Found {} active memberships that exceeded expiry cutoff {}", JOB_NAME, toExpire.size(), cutoffDate);

        for (Membership m : toExpire) {
            try {
                m.setStatus(MembershipStatus.EXPIRED);
                m.setActive(false);
                m.setUpdatedAt(timeUtils.now());
                membershipRepository.save(m);

                Member member = m.getMember();
                if (member != null) {
                    member.setStatus(MemberStatus.EXPIRED);
                    member.setUpdatedAt(timeUtils.now());
                    memberRepository.save(member);

                    // Audit event
                    MembershipEvent event = MembershipEvent.builder()
                            .membership(m)
                            .member(member)
                            .eventType(MembershipEventType.EXPIRED)
                            .fromStatus(MembershipStatus.ACTIVE.name())
                            .toStatus(MembershipStatus.EXPIRED.name())
                            .effectiveDate(today)
                            .actor("SYSTEM_EXPIRY_JOB")
                            .reason(String.format("Membership expired on %s (Grace period: %d days).", m.getEndDate(), gracePeriodDays))
                            .createdAt(timeUtils.now())
                            .build();
                    eventRepository.save(event);

                    // Record reminder entry if not present
                    if (!reminderRepository.existsByMemberIdAndMembershipIdAndReminderType(member.getId(), m.getId(), ReminderType.EXPIRED)) {
                        reminderRepository.save(MembershipReminder.builder()
                                .member(member)
                                .membership(m)
                                .reminderType(ReminderType.EXPIRED)
                                .sentAt(timeUtils.now())
                                .status("SENT")
                                .build());

                        // Dispatch notification
                        notificationDispatcher.dispatch(
                                member.getUser(),
                                member,
                                "Membership Expired",
                                String.format("Hello %s, your %s membership expired on %s. Renew today to restore your 25%% discount and court booking access.",
                                        member.getFullName(), m.getPlan() != null ? m.getPlan().getName() : "Club", m.getEndDate()),
                                NotificationType.MEMBERSHIP_EXPIRY,
                                "{\"status\":\"EXPIRED\",\"endDate\":\"" + m.getEndDate() + "\"}"
                        );
                    }
                }
            } catch (Exception ex) {
                log.error("Failed to expire membership {}: {}", m.getId(), ex.getMessage(), ex);
            }
        }

        return toExpire.size();
    }
}
