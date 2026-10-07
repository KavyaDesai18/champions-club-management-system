package com.championsclub.member.service;

import com.championsclub.common.audit.AuditService;
import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.time.ClubTimeUtils;
import com.championsclub.member.domain.CheckInStatus;
import com.championsclub.member.domain.Member;
import com.championsclub.member.domain.MemberCheckIn;
import com.championsclub.member.domain.MemberStatus;
import com.championsclub.member.domain.Membership;
import com.championsclub.member.domain.MembershipStatus;
import com.championsclub.member.domain.Plan;
import com.championsclub.member.dto.CheckInRequest;
import com.championsclub.member.dto.CheckInResponse;
import com.championsclub.member.repo.MemberCheckInRepository;
import com.championsclub.member.repo.MemberRepository;
import com.championsclub.member.repo.MembershipRepository;
import com.championsclub.notification.service.NotificationDispatcher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Front Desk Check-In Service Unit Tests")
class CheckInServiceTest {

    @Mock private MemberRepository memberRepository;
    @Mock private MembershipRepository membershipRepository;
    @Mock private MemberCheckInRepository checkInRepository;
    @Mock private QrCodeService qrCodeService;
    @Mock private NotificationDispatcher notificationDispatcher;
    @Mock private AuditService auditService;

    private ClubTimeUtils timeUtils;
    private CheckInService checkInService;

    private final LocalDate fixedToday = LocalDate.of(2026, 6, 15);
    private final ZoneId zoneId = ZoneId.of("Asia/Kolkata");
    private final UUID memberId = UUID.randomUUID();
    private Member member;
    private Plan goldPlan;

    @BeforeEach
    void setUp() {
        Clock fixedClock = Clock.fixed(fixedToday.atTime(10, 0).atZone(zoneId).toInstant(), zoneId);
        timeUtils = new ClubTimeUtils(fixedClock, zoneId);

        checkInService = new CheckInService(
                memberRepository,
                membershipRepository,
                checkInRepository,
                qrCodeService,
                notificationDispatcher,
                timeUtils,
                auditService
        );

        goldPlan = Plan.builder().code("GOLD").name("Gold Tier VIP").price(BigDecimal.valueOf(3000)).build();

        member = Member.builder()
                .id(memberId)
                .memberNo("CC-009988")
                .fullName("Bruce Wayne")
                .email("bruce@wayne.com")
                .phone("+919999999999")
                .dob(LocalDate.of(1985, 2, 19))
                .status(MemberStatus.ACTIVE)
                .plan(goldPlan)
                .walletBalance(BigDecimal.valueOf(5000.00))
                .guestPassesRemaining(2)
                .startDate(LocalDate.of(2026, 1, 1))
                .endDate(LocalDate.of(2026, 12, 31))
                .build();
    }

    @Test
    @DisplayName("Scans QR token with > 7 days remaining -> returns ACTIVE status banner (GREEN)")
    void testCheckInActiveMember() {
        when(qrCodeService.verifyQrToken("VALID-TOKEN")).thenReturn(new QrCodeService.VerifiedQrToken(memberId, "CC-009988", Instant.now().plusSeconds(3600)));
        when(memberRepository.findByIdAndIsDeletedFalse(memberId)).thenReturn(Optional.of(member));
        when(checkInRepository.findRecentCheckIn(any(UUID.class), any(Instant.class))).thenReturn(Optional.empty());

        Membership active = Membership.builder().id(UUID.randomUUID()).member(member).status(MembershipStatus.ACTIVE).endDate(LocalDate.of(2026, 12, 31)).build();
        when(membershipRepository.findActiveByMemberId(memberId)).thenReturn(Optional.of(active));
        when(checkInRepository.save(any(MemberCheckIn.class))).thenAnswer(inv -> inv.getArgument(0));

        CheckInRequest request = CheckInRequest.builder().qrToken("VALID-TOKEN").location("FRONT_DESK_WEST").build();
        CheckInResponse response = checkInService.processCheckIn(request, "FRONT_DESK_STAFF");

        assertThat(response.getStatusBanner()).isEqualTo("ACTIVE");
        assertThat(response.getDaysLeft()).isGreaterThan(7);
        assertThat(response.getMemberNo()).isEqualTo("CC-009988");
        assertThat(response.getFullName()).isEqualTo("Bruce Wayne");
    }

    @Test
    @DisplayName("Scans QR token with <= 7 days remaining -> returns EXPIRING_SOON banner (AMBER)")
    void testCheckInExpiringSoonMember() {
        // Expiry in 4 days (2026-06-19 relative to 2026-06-15)
        member.setEndDate(fixedToday.plusDays(4));

        when(qrCodeService.verifyQrToken("EXPIRING-TOKEN")).thenReturn(new QrCodeService.VerifiedQrToken(memberId, "CC-009988", Instant.now().plusSeconds(3600)));
        when(memberRepository.findByIdAndIsDeletedFalse(memberId)).thenReturn(Optional.of(member));
        when(checkInRepository.findRecentCheckIn(any(UUID.class), any(Instant.class))).thenReturn(Optional.empty());

        Membership active = Membership.builder().id(UUID.randomUUID()).member(member).status(MembershipStatus.ACTIVE).endDate(fixedToday.plusDays(4)).build();
        when(membershipRepository.findActiveByMemberId(memberId)).thenReturn(Optional.of(active));
        when(checkInRepository.save(any(MemberCheckIn.class))).thenAnswer(inv -> inv.getArgument(0));

        CheckInRequest request = CheckInRequest.builder().qrToken("EXPIRING-TOKEN").build();
        CheckInResponse response = checkInService.processCheckIn(request, "FRONT_DESK");

        assertThat(response.getStatusBanner()).isEqualTo("EXPIRING_SOON");
        assertThat(response.getDaysLeft()).isEqualTo(4);
    }

    @Test
    @DisplayName("Scans QR token of EXPIRED member -> returns EXPIRED status banner (RED)")
    void testCheckInExpiredMember() {
        // Expiry was yesterday
        member.setEndDate(fixedToday.minusDays(1));
        member.setStatus(MemberStatus.EXPIRED);

        when(qrCodeService.verifyQrToken("EXPIRED-TOKEN")).thenReturn(new QrCodeService.VerifiedQrToken(memberId, "CC-009988", Instant.now().plusSeconds(3600)));
        when(memberRepository.findByIdAndIsDeletedFalse(memberId)).thenReturn(Optional.of(member));
        when(checkInRepository.findRecentCheckIn(any(UUID.class), any(Instant.class))).thenReturn(Optional.empty());
        when(membershipRepository.findActiveByMemberId(memberId)).thenReturn(Optional.empty());
        when(checkInRepository.save(any(MemberCheckIn.class))).thenAnswer(inv -> inv.getArgument(0));

        CheckInRequest request = CheckInRequest.builder().qrToken("EXPIRED-TOKEN").build();
        CheckInResponse response = checkInService.processCheckIn(request, "FRONT_DESK");

        assertThat(response.getStatusBanner()).isEqualTo("EXPIRED");
        assertThat(response.getDaysLeft()).isEqualTo(0);
        assertThat(response.getMessage()).contains("MEMBERSHIP EXPIRED");
    }

    @Test
    @DisplayName("Scans QR token of SUSPENDED member -> returns SUSPENDED status banner (RED)")
    void testCheckInSuspendedMember() {
        member.setStatus(MemberStatus.SUSPENDED);

        when(qrCodeService.verifyQrToken("SUSPENDED-TOKEN")).thenReturn(new QrCodeService.VerifiedQrToken(memberId, "CC-009988", Instant.now().plusSeconds(3600)));
        when(memberRepository.findByIdAndIsDeletedFalse(memberId)).thenReturn(Optional.of(member));
        when(checkInRepository.findRecentCheckIn(any(UUID.class), any(Instant.class))).thenReturn(Optional.empty());
        when(checkInRepository.save(any(MemberCheckIn.class))).thenAnswer(inv -> inv.getArgument(0));

        CheckInRequest request = CheckInRequest.builder().qrToken("SUSPENDED-TOKEN").build();
        CheckInResponse response = checkInService.processCheckIn(request, "FRONT_DESK");

        assertThat(response.getStatusBanner()).isEqualTo("SUSPENDED");
        assertThat(response.getMessage()).contains("MEMBER SUSPENDED");
    }

    @Test
    @DisplayName("Prevents duplicate check-in within 5 minutes (throws DUPLICATE_CHECK_IN)")
    void testPreventDuplicateCheckInWithinFiveMinutes() {
        when(qrCodeService.verifyQrToken("TOKEN-1")).thenReturn(new QrCodeService.VerifiedQrToken(memberId, "CC-009988", Instant.now().plusSeconds(3600)));
        when(memberRepository.findByIdAndIsDeletedFalse(memberId)).thenReturn(Optional.of(member));

        // Prior check-in 2 minutes ago
        MemberCheckIn recent = MemberCheckIn.builder()
                .member(member)
                .checkedInAt(timeUtils.now().minusSeconds(120))
                .location("FRONT_DESK_MAIN")
                .build();
        when(checkInRepository.findRecentCheckIn(any(UUID.class), any(Instant.class))).thenReturn(Optional.of(recent));

        CheckInRequest request = CheckInRequest.builder().qrToken("TOKEN-1").build();

        assertThatThrownBy(() -> checkInService.processCheckIn(request, "FRONT_DESK"))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Duplicate check-in prevented")
                .matches(e -> "DUPLICATE_CHECK_IN".equals(((BusinessValidationException) e).getCode()));
    }
}
