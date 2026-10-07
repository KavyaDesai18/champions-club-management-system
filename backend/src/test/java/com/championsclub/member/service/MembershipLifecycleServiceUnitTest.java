package com.championsclub.member.service;

import com.championsclub.common.audit.AuditService;
import com.championsclub.common.time.ClubTimeUtils;
import com.championsclub.member.domain.Member;
import com.championsclub.member.domain.MemberStatus;
import com.championsclub.member.domain.Membership;
import com.championsclub.member.domain.MembershipEvent;
import com.championsclub.member.domain.MembershipEventType;
import com.championsclub.member.domain.MembershipStatus;
import com.championsclub.member.domain.Plan;
import com.championsclub.member.dto.ChangePlanRequest;
import com.championsclub.member.dto.MembershipDto;
import com.championsclub.member.dto.RenewMembershipRequest;
import com.championsclub.member.refund.DefaultMembershipRefundHook;
import com.championsclub.member.refund.MembershipRefundHook;
import com.championsclub.member.refund.RefundResult;
import com.championsclub.member.repo.MemberRepository;
import com.championsclub.member.repo.MembershipEventRepository;
import com.championsclub.member.repo.MembershipRepository;
import com.championsclub.notification.service.NotificationDispatcher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Membership Lifecycle Service Unit Tests")
class MembershipLifecycleServiceUnitTest {

    @Mock private MembershipRepository membershipRepository;
    @Mock private MembershipEventRepository eventRepository;
    @Mock private MemberRepository memberRepository;
    @Mock private PlanService planService;
    @Mock private MembershipRefundHook refundHook;
    @Mock private NotificationDispatcher notificationDispatcher;
    @Mock private AuditService auditService;

    private ClubTimeUtils timeUtils;
    private final MembershipDateCalculator dateCalculator = new MembershipDateCalculator();
    private MembershipLifecycleService lifecycleService;

    private final LocalDate fixedToday = LocalDate.of(2026, 6, 15);
    private final ZoneId zoneId = ZoneId.of("Asia/Kolkata");
    private final UUID memberId = UUID.randomUUID();
    private Member member;
    private Plan goldPlan;
    private Plan silverPlan;

    @BeforeEach
    void setUp() {
        Clock fixedClock = Clock.fixed(fixedToday.atStartOfDay(zoneId).toInstant(), zoneId);
        timeUtils = new ClubTimeUtils(fixedClock, zoneId);

        lifecycleService = new MembershipLifecycleService(
                membershipRepository,
                eventRepository,
                memberRepository,
                planService,
                dateCalculator,
                refundHook,
                notificationDispatcher,
                timeUtils,
                auditService,
                0 // 0 grace period default
        );

        goldPlan = Plan.builder()
                .code("GOLD")
                .name("Gold Tier VIP")
                .price(BigDecimal.valueOf(3000.00))
                .durationMonths(12)
                .build();

        silverPlan = Plan.builder()
                .code("SILVER")
                .name("Silver Standard")
                .price(BigDecimal.valueOf(1500.00))
                .durationMonths(12)
                .build();

        member = Member.builder()
                .id(memberId)
                .memberNo("CC-001001")
                .fullName("Sarah Connor")
                .email("sarah@resistance.org")
                .phone("+919876543210")
                .dob(LocalDate.of(1995, 5, 20))
                .status(MemberStatus.ACTIVE)
                .plan(goldPlan)
                .startDate(LocalDate.of(2025, 7, 1))
                .endDate(LocalDate.of(2026, 7, 1))
                .walletBalance(BigDecimal.ZERO)
                .build();
    }

    @Test
    @DisplayName("Renewal BEFORE expiry extends from current end_date (no lost days)")
    void testRenewalBeforeExpiryExtendsFromCurrentEndDate() {
        // Current end date is 2026-07-01 (16 days in the future relative to 2026-06-15)
        Membership currentActive = Membership.builder()
                .id(UUID.randomUUID())
                .member(member)
                .plan(goldPlan)
                .startDate(LocalDate.of(2025, 7, 1))
                .endDate(LocalDate.of(2026, 7, 1))
                .status(MembershipStatus.ACTIVE)
                .pricePaid(BigDecimal.valueOf(3000.00))
                .active(true)
                .build();

        when(memberRepository.findByIdAndIsDeletedFalse(memberId)).thenReturn(Optional.of(member));
        when(membershipRepository.findActiveByMemberId(memberId)).thenReturn(Optional.of(currentActive));
        when(planService.getPlanByCode("GOLD")).thenReturn(goldPlan);
        when(membershipRepository.save(any(Membership.class))).thenAnswer(inv -> inv.getArgument(0));

        RenewMembershipRequest request = RenewMembershipRequest.builder()
                .planCode("GOLD")
                .pricePaid(BigDecimal.valueOf(3000.00))
                .paymentRef("PAY-ONLINE-999")
                .build();

        MembershipDto dto = lifecycleService.renewMembership(memberId, request, "SARAH");

        // Start date should equal old end date, new end date should be 12 months after old end date
        assertThat(dto.getStartDate()).isEqualTo(LocalDate.of(2026, 7, 1));
        assertThat(dto.getEndDate()).isEqualTo(LocalDate.of(2027, 7, 1));
        assertThat(dto.getStatus()).isEqualTo("ACTIVE");

        // Previous membership must be retired
        assertThat(currentActive.getStatus()).isEqualTo(MembershipStatus.EXPIRED);
        assertThat(currentActive.isActive()).isFalse();

        // Audit event recorded
        ArgumentCaptor<MembershipEvent> eventCaptor = ArgumentCaptor.forClass(MembershipEvent.class);
        verify(eventRepository).save(eventCaptor.capture());
        assertThat(eventCaptor.getValue().getEventType()).isEqualTo(MembershipEventType.RENEWED);
    }

    @Test
    @DisplayName("Renewal on the EXACT expiry day extends from current end_date (no lost days)")
    void testRenewalOnExactExpiryDayExtendsFromCurrentEndDate() {
        // Today is 2026-06-15, membership expires today
        Membership currentActive = Membership.builder()
                .id(UUID.randomUUID())
                .member(member)
                .plan(goldPlan)
                .startDate(LocalDate.of(2025, 6, 15))
                .endDate(fixedToday)
                .status(MembershipStatus.ACTIVE)
                .active(true)
                .build();

        when(memberRepository.findByIdAndIsDeletedFalse(memberId)).thenReturn(Optional.of(member));
        when(membershipRepository.findActiveByMemberId(memberId)).thenReturn(Optional.of(currentActive));
        when(planService.getPlanByCode("GOLD")).thenReturn(goldPlan);
        when(membershipRepository.save(any(Membership.class))).thenAnswer(inv -> inv.getArgument(0));

        RenewMembershipRequest request = RenewMembershipRequest.builder().planCode("GOLD").build();
        MembershipDto dto = lifecycleService.renewMembership(memberId, request, "SARAH");

        assertThat(dto.getStartDate()).isEqualTo(fixedToday);
        assertThat(dto.getEndDate()).isEqualTo(fixedToday.plusMonths(12));
    }

    @Test
    @DisplayName("Renewal AFTER expiry starts today")
    void testRenewalAfterExpiryStartsToday() {
        // Membership expired 5 days ago (2026-06-10)
        LocalDate expiredDate = LocalDate.of(2026, 6, 10);
        member.setEndDate(expiredDate);
        member.setStatus(MemberStatus.EXPIRED);

        when(memberRepository.findByIdAndIsDeletedFalse(memberId)).thenReturn(Optional.of(member));
        when(membershipRepository.findActiveByMemberId(memberId)).thenReturn(Optional.empty());
        when(planService.getPlanByCode("GOLD")).thenReturn(goldPlan);
        when(membershipRepository.save(any(Membership.class))).thenAnswer(inv -> inv.getArgument(0));

        RenewMembershipRequest request = RenewMembershipRequest.builder().planCode("GOLD").build();
        MembershipDto dto = lifecycleService.renewMembership(memberId, request, "SARAH");

        // New membership starts today (fixedToday)
        assertThat(dto.getStartDate()).isEqualTo(fixedToday);
        assertThat(dto.getEndDate()).isEqualTo(fixedToday.plusMonths(12));
        assertThat(member.getStatus()).isEqualTo(MemberStatus.ACTIVE);
    }

    @Test
    @DisplayName("Mid-term plan change prorates remaining value as credit and updates wallet on downgrade")
    void testMidTermPlanChangeProrationAndDowngradeWalletCredit() {
        // Active Gold plan (3000) ending 2026-12-31 (~200 days remaining)
        Membership activeMembership = Membership.builder()
                .id(UUID.randomUUID())
                .member(member)
                .plan(goldPlan)
                .startDate(LocalDate.of(2026, 1, 1))
                .endDate(LocalDate.of(2026, 12, 31))
                .pricePaid(BigDecimal.valueOf(3000.00))
                .status(MembershipStatus.ACTIVE)
                .active(true)
                .build();

        when(memberRepository.findByIdAndIsDeletedFalse(memberId)).thenReturn(Optional.of(member));
        when(membershipRepository.findActiveByMemberId(memberId)).thenReturn(Optional.of(activeMembership));
        when(planService.getPlanByCode("SILVER")).thenReturn(silverPlan);
        when(membershipRepository.save(any(Membership.class))).thenAnswer(inv -> inv.getArgument(0));

        ChangePlanRequest request = ChangePlanRequest.builder()
                .planCode("SILVER")
                .reason("Downgrading to Silver tier")
                .build();

        MembershipDto dto = lifecycleService.processMidTermPlanChange(memberId, request, "FRONT_DESK");

        assertThat(dto.getPlanCode()).isEqualTo("SILVER");
        assertThat(dto.getStartDate()).isEqualTo(fixedToday);
        assertThat(dto.getStatus()).isEqualTo("ACTIVE");
        assertThat(activeMembership.getStatus()).isEqualTo(MembershipStatus.CANCELLED);
    }

    @Test
    @DisplayName("Member suspension and reactivation extends end date by freeze days")
    void testSuspensionAndReactivationFreezeDays() {
        LocalDate originalEndDate = LocalDate.of(2026, 12, 31);
        Membership activeMembership = Membership.builder()
                .id(UUID.randomUUID())
                .member(member)
                .plan(goldPlan)
                .startDate(LocalDate.of(2026, 1, 1))
                .endDate(originalEndDate)
                .status(MembershipStatus.ACTIVE)
                .freezeDays(0)
                .active(true)
                .build();

        when(memberRepository.findByIdAndIsDeletedFalse(memberId)).thenReturn(Optional.of(member));
        when(membershipRepository.findActiveByMemberId(memberId)).thenReturn(Optional.of(activeMembership));

        // 1. Suspend member on 2026-06-01 (14 days ago)
        member.setSuspendedAt(LocalDate.of(2026, 6, 1));
        member.setStatus(MemberStatus.SUSPENDED);

        // 2. Reactivate today (2026-06-15) -> 14 freeze days
        lifecycleService.handleMemberReactivation(memberId, "STAFF_ADMIN");

        assertThat(activeMembership.getFreezeDays()).isEqualTo(14);
        assertThat(activeMembership.getEndDate()).isEqualTo(originalEndDate.plusDays(14));
        assertThat(member.getEndDate()).isEqualTo(originalEndDate.plusDays(14));
        assertThat(member.getStatus()).isEqualTo(MemberStatus.ACTIVE);
        assertThat(member.getSuspendedAt()).isNull();
    }

    @Test
    @DisplayName("Cancel membership invokes refund hook")
    void testCancelMembershipInvokesRefundHook() {
        Membership activeMembership = Membership.builder()
                .id(UUID.randomUUID())
                .member(member)
                .plan(goldPlan)
                .startDate(LocalDate.of(2026, 1, 1))
                .endDate(LocalDate.of(2026, 12, 31))
                .pricePaid(BigDecimal.valueOf(3000.00))
                .status(MembershipStatus.ACTIVE)
                .active(true)
                .build();

        when(memberRepository.findByIdAndIsDeletedFalse(memberId)).thenReturn(Optional.of(member));
        when(membershipRepository.findActiveByMemberId(memberId)).thenReturn(Optional.of(activeMembership));
        when(refundHook.calculateAndProcessRefund(any(), any(), any())).thenReturn(
                RefundResult.builder()
                        .success(true)
                        .refundableAmount(BigDecimal.valueOf(1600.00))
                        .refundReference("REF-TEST-123")
                        .note("Prorated refund calculated")
                        .build()
        );

        RefundResult result = lifecycleService.cancelMembership(memberId, "Moving overseas", "STAFF");

        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getRefundableAmount()).isEqualByComparingTo(BigDecimal.valueOf(1600.00));
        assertThat(activeMembership.getStatus()).isEqualTo(MembershipStatus.CANCELLED);
        assertThat(member.getStatus()).isEqualTo(MemberStatus.CANCELLED);
    }
}
