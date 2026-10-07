package com.championsclub.member.job;

import com.championsclub.common.lock.JobLockService;
import com.championsclub.common.time.ClubTimeUtils;
import com.championsclub.member.domain.Member;
import com.championsclub.member.domain.MemberStatus;
import com.championsclub.member.domain.Membership;
import com.championsclub.member.domain.MembershipReminder;
import com.championsclub.member.domain.MembershipStatus;
import com.championsclub.member.domain.Plan;
import com.championsclub.member.domain.ReminderType;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.MemberRepository;
import com.championsclub.member.repo.MembershipEventRepository;
import com.championsclub.member.repo.MembershipReminderRepository;
import com.championsclub.member.repo.MembershipRepository;
import com.championsclub.notification.domain.Notification;
import com.championsclub.notification.domain.NotificationType;
import com.championsclub.notification.provider.EmailProvider;
import com.championsclub.notification.provider.SmsProvider;
import com.championsclub.notification.repo.NotificationPreferenceRepository;
import com.championsclub.notification.repo.NotificationRepository;
import com.championsclub.notification.service.NotificationDispatcher;
import com.championsclub.notification.service.SseNotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Scheduled Jobs & Edge Cases Unit Test Suite")
class DailyMembershipJobsTest {

    @Mock private MembershipRepository membershipRepository;
    @Mock private MemberRepository memberRepository;
    @Mock private MembershipEventRepository eventRepository;
    @Mock private MembershipReminderRepository reminderRepository;
    @Mock private JobLockService jobLockService;

    @Mock private NotificationRepository notificationRepository;
    @Mock private NotificationPreferenceRepository preferenceRepository;
    @Mock private EmailProvider emailProvider;
    @Mock private SmsProvider smsProvider;
    @Mock private SseNotificationService sseNotificationService;

    private NotificationDispatcher notificationDispatcher;
    private ClubTimeUtils timeUtils;
    private DailyMembershipExpiryJob expiryJob;
    private DailyMembershipReminderJob reminderJob;

    private final LocalDate fixedToday = LocalDate.of(2026, 6, 15);
    private final ZoneId zoneId = ZoneId.of("Asia/Kolkata");

    @BeforeEach
    void setUp() {
        Clock fixedClock = Clock.fixed(fixedToday.atStartOfDay(zoneId).toInstant(), zoneId);
        timeUtils = new ClubTimeUtils(fixedClock, zoneId);

        notificationDispatcher = new NotificationDispatcher(
                notificationRepository,
                preferenceRepository,
                emailProvider,
                smsProvider,
                sseNotificationService,
                fixedClock
        );

        expiryJob = new DailyMembershipExpiryJob(
                membershipRepository,
                memberRepository,
                eventRepository,
                reminderRepository,
                jobLockService,
                notificationDispatcher,
                timeUtils,
                0 // 0 grace period
        );

        reminderJob = new DailyMembershipReminderJob(
                membershipRepository,
                reminderRepository,
                jobLockService,
                notificationDispatcher,
                timeUtils
        );

        when(jobLockService.acquireLock(anyString(), anyString(), any(Duration.class))).thenReturn(true);
    }

    @Test
    @DisplayName("Edge Case 1: Expiry job runs twice on the same day (Idempotent)")
    void testExpiryJobRunsTwiceIdempotency() {
        Member member = Member.builder()
                .id(UUID.randomUUID())
                .memberNo("CC-001")
                .fullName("John Wick")
                .status(MemberStatus.ACTIVE)
                .endDate(fixedToday.minusDays(1)) // Expired yesterday
                .build();

        Membership m = Membership.builder()
                .id(UUID.randomUUID())
                .member(member)
                .status(MembershipStatus.ACTIVE)
                .endDate(fixedToday.minusDays(1))
                .active(true)
                .build();

        // Run 1: finds 1 membership that expired
        when(membershipRepository.findActiveExpiredBefore(fixedToday)).thenReturn(List.of(m));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        int run1Count = expiryJob.executeDailyExpiry();
        assertThat(run1Count).isEqualTo(1);
        assertThat(m.getStatus()).isEqualTo(MembershipStatus.EXPIRED);
        assertThat(member.getStatus()).isEqualTo(MemberStatus.EXPIRED);

        // Run 2: immediately runs again, finds 0 active expired memberships
        when(membershipRepository.findActiveExpiredBefore(fixedToday)).thenReturn(Collections.emptyList());

        int run2Count = expiryJob.executeDailyExpiry();
        assertThat(run2Count).isZero();
    }

    @Test
    @DisplayName("Edge Case 2: Expiry job catches up after server down for 3 days")
    void testExpiryJobCatchesUpAfterServerDownForThreeDays() {
        // Memberships that expired 3 days ago, 2 days ago, and yesterday
        Member m1 = Member.builder().id(UUID.randomUUID()).memberNo("CC-001").status(MemberStatus.ACTIVE).endDate(fixedToday.minusDays(3)).build();
        Member m2 = Member.builder().id(UUID.randomUUID()).memberNo("CC-002").status(MemberStatus.ACTIVE).endDate(fixedToday.minusDays(2)).build();
        Member m3 = Member.builder().id(UUID.randomUUID()).memberNo("CC-003").status(MemberStatus.ACTIVE).endDate(fixedToday.minusDays(1)).build();

        Membership mem1 = Membership.builder().id(UUID.randomUUID()).member(m1).status(MembershipStatus.ACTIVE).endDate(fixedToday.minusDays(3)).build();
        Membership mem2 = Membership.builder().id(UUID.randomUUID()).member(m2).status(MembershipStatus.ACTIVE).endDate(fixedToday.minusDays(2)).build();
        Membership mem3 = Membership.builder().id(UUID.randomUUID()).member(m3).status(MembershipStatus.ACTIVE).endDate(fixedToday.minusDays(1)).build();

        when(membershipRepository.findActiveExpiredBefore(fixedToday)).thenReturn(List.of(mem1, mem2, mem3));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        int processed = expiryJob.executeDailyExpiry();
        assertThat(processed).isEqualTo(3);
        assertThat(mem1.getStatus()).isEqualTo(MembershipStatus.EXPIRED);
        assertThat(mem2.getStatus()).isEqualTo(MembershipStatus.EXPIRED);
        assertThat(mem3.getStatus()).isEqualTo(MembershipStatus.EXPIRED);
    }

    @Test
    @DisplayName("Edge Case 3: Reminder deduplication - never sends the same reminder twice")
    void testReminderDeduplicationRule() {
        Member member = Member.builder()
                .id(UUID.randomUUID())
                .memberNo("CC-005")
                .fullName("Ellen Ripley")
                .endDate(fixedToday.plusDays(7)) // 7 days left
                .build();

        Membership membership = Membership.builder()
                .id(UUID.randomUUID())
                .member(member)
                .endDate(fixedToday.plusDays(7))
                .status(MembershipStatus.ACTIVE)
                .build();

        when(membershipRepository.findActiveExpiringBetween(any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.of(membership));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        // First run: reminder has not been sent yet
        when(reminderRepository.existsByMemberIdAndMembershipIdAndReminderType(member.getId(), membership.getId(), ReminderType.EXPIRY_7_DAYS))
                .thenReturn(false);

        int sentRun1 = reminderJob.executeDailyReminders();
        assertThat(sentRun1).isEqualTo(1);
        verify(reminderRepository).saveAndFlush(any(MembershipReminder.class));

        // Second run: reminder was already sent
        when(reminderRepository.existsByMemberIdAndMembershipIdAndReminderType(member.getId(), membership.getId(), ReminderType.EXPIRY_7_DAYS))
                .thenReturn(true);

        int sentRun2 = reminderJob.executeDailyReminders();
        assertThat(sentRun2).isZero(); // Skipped! Never sent twice.
    }

    @Test
    @DisplayName("Edge Case 4: Reminder for member with NO email and NO phone still generates in-app notification")
    void testReminderForMemberWithNoEmailOrPhone() {
        Member member = Member.builder()
                .id(UUID.randomUUID())
                .memberNo("CC-009")
                .fullName("Anonymous Athlete")
                .email(null)
                .phone(null)
                .endDate(fixedToday.plusDays(1)) // 1 day left
                .build();

        Membership membership = Membership.builder()
                .id(UUID.randomUUID())
                .member(member)
                .endDate(fixedToday.plusDays(1))
                .status(MembershipStatus.ACTIVE)
                .build();

        when(membershipRepository.findActiveExpiringBetween(any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.of(membership));
        when(reminderRepository.existsByMemberIdAndMembershipIdAndReminderType(member.getId(), membership.getId(), ReminderType.EXPIRY_1_DAY))
                .thenReturn(false);
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        int sent = reminderJob.executeDailyReminders();
        assertThat(sent).isEqualTo(1);

        // Neither emailProvider nor smsProvider should have been invoked with invalid data
        verify(emailProvider, never()).sendEmail(anyString(), anyString(), anyString());
        verify(smsProvider, never()).sendSms(anyString(), anyString());

        // In-app notification was saved
        verify(notificationRepository).save(any(Notification.class));
    }

    @Test
    @DisplayName("Edge Case 5: Notification provider throws exception -> retries with backoff and DOES NOT fail the job")
    void testNotificationProviderThrowsExceptionRetryWithBackoffAndDoesNotBlockJob() {
        Member member = Member.builder()
                .id(UUID.randomUUID())
                .memberNo("CC-010")
                .fullName("Logan Howlett")
                .email("logan@xmen.com")
                .phone("+919000000000")
                .endDate(fixedToday.plusDays(1))
                .build();

        Membership membership = Membership.builder()
                .id(UUID.randomUUID())
                .member(member)
                .endDate(fixedToday.plusDays(1))
                .status(MembershipStatus.ACTIVE)
                .build();

        when(membershipRepository.findActiveExpiringBetween(any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.of(membership));
        when(reminderRepository.existsByMemberIdAndMembershipIdAndReminderType(member.getId(), membership.getId(), ReminderType.EXPIRY_1_DAY))
                .thenReturn(false);
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        // Simulate EmailProvider throwing runtime network/gateway exception on every attempt
        doThrow(new RuntimeException("SMTP Gateway Timeout: 504")).when(emailProvider).sendEmail(anyString(), anyString(), anyString());

        // Job should complete cleanly and return 1 without throwing exception!
        int sent = reminderJob.executeDailyReminders();
        assertThat(sent).isEqualTo(1);

        // Verify that retry was executed (3 attempts)
        verify(emailProvider, times(3)).sendEmail(eq("logan@xmen.com"), anyString(), anyString());

        // In-app notification is preserved
        verify(notificationRepository).save(any(Notification.class));
    }
}
