package com.championsclub.social.service;

import com.championsclub.common.security.Role;
import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.DoubleBookingException;
import com.championsclub.common.time.ClubTimeUtils;
import com.championsclub.court.domain.*;
import com.championsclub.court.repo.BookingRepository;
import com.championsclub.court.repo.CourtBlackoutRepository;
import com.championsclub.court.repo.CourtRepository;
import com.championsclub.court.repo.SportRepository;
import com.championsclub.member.domain.*;
import com.championsclub.member.repo.MemberRepository;
import com.championsclub.member.repo.UserRepository;
import com.championsclub.notification.service.NotificationDispatcher;
import com.championsclub.social.domain.*;
import com.championsclub.social.dto.*;
import com.championsclub.social.repo.SocialParticipantRepository;
import com.championsclub.social.repo.SocialSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.math.BigDecimal;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SocialPlayServiceTest {

    @Mock private SocialSessionRepository sessionRepository;
    @Mock private SocialParticipantRepository participantRepository;
    @Mock private CourtRepository courtRepository;
    @Mock private SportRepository sportRepository;
    @Mock private BookingRepository bookingRepository;
    @Mock private CourtBlackoutRepository blackoutRepository;
    @Mock private MemberRepository memberRepository;
    @Mock private UserRepository userRepository;
    @Mock private NotificationDispatcher notificationDispatcher;

    private SocialPlayService service;
    private Clock fixedClock;
    private ClubTimeUtils timeUtils;

    private Court activeCourt;
    private Court maintenanceCourt;
    private Sport tennisSport;
    private User adminUser;
    private Member activeGoldMember;
    private Member activeSilverMember;
    private Member juniorMemberNoGuardian;
    private Member juniorMemberWithGuardian;

    @BeforeEach
    void setUp() {
        // Fix clock at Friday 2026-10-09 10:00:00 UTC
        Instant fixedInstant = Instant.parse("2026-10-09T10:00:00Z");
        fixedClock = Clock.fixed(fixedInstant, ZoneId.of("Asia/Kolkata"));
        timeUtils = new ClubTimeUtils(fixedClock, ZoneId.of("Asia/Kolkata"));

        service = new SocialPlayService(
                sessionRepository,
                participantRepository,
                courtRepository,
                sportRepository,
                bookingRepository,
                blackoutRepository,
                memberRepository,
                userRepository,
                notificationDispatcher,
                timeUtils,
                fixedClock
        );

        tennisSport = Sport.builder()
                .id(UUID.randomUUID())
                .name("Tennis")
                .defaultSessionMinutes(60)
                .build();

        activeCourt = Court.builder()
                .id(UUID.randomUUID())
                .name("Center Court 1")
                .sport(tennisSport)
                .status(CourtStatus.ACTIVE)
                .surface("CLAY")
                .isActive(true)
                .build();

        maintenanceCourt = Court.builder()
                .id(UUID.randomUUID())
                .name("Court 2 - Maintenance")
                .sport(tennisSport)
                .status(CourtStatus.MAINTENANCE)
                .surface("HARD")
                .isActive(false)
                .build();

        adminUser = User.builder()
                .id(UUID.randomUUID())
                .email("admin@championsclub.com")
                .role(Role.MANAGER)
                .build();

        Plan goldPlan = Plan.builder().id(UUID.randomUUID()).code("GOLD").name("Gold VIP").build();
        Plan silverPlan = Plan.builder().id(UUID.randomUUID()).code("SILVER").name("Silver Regular").build();

        activeGoldMember = Member.builder()
                .id(UUID.randomUUID())
                .memberNo("CC-M-001")
                .fullName("Roger Federer")
                .email("roger@tennis.com")
                .phone("+15551111111")
                .dob(LocalDate.of(1981, 8, 8))
                .status(MemberStatus.ACTIVE)
                .plan(goldPlan)
                .build();

        activeSilverMember = Member.builder()
                .id(UUID.randomUUID())
                .memberNo("CC-M-002")
                .fullName("Carlos Alcaraz")
                .email("carlos@tennis.com")
                .phone("+15552222222")
                .dob(LocalDate.of(2003, 5, 5))
                .status(MemberStatus.ACTIVE)
                .plan(silverPlan)
                .build();

        juniorMemberNoGuardian = Member.builder()
                .id(UUID.randomUUID())
                .memberNo("CC-M-003")
                .fullName("Junior Cadet")
                .email("junior@tennis.com")
                .phone("+15553333333")
                .dob(LocalDate.of(2012, 1, 1))
                .status(MemberStatus.ACTIVE)
                .plan(silverPlan)
                .guardian(null)
                .build();

        Guardian guardian = Guardian.builder().id(UUID.randomUUID()).name("Papa Cadet").phone("+15554444444").relation("Father").build();
        juniorMemberWithGuardian = Member.builder()
                .id(UUID.randomUUID())
                .memberNo("CC-M-004")
                .fullName("Junior Protected")
                .email("protected@tennis.com")
                .phone("+15554444445")
                .dob(LocalDate.of(2012, 1, 1))
                .status(MemberStatus.ACTIVE)
                .plan(silverPlan)
                .guardian(guardian)
                .build();
    }

    @Test
    @DisplayName("Create session blocks court with SOCIAL_BLOCK booking row and handles collisions")
    void testCreateSessionBlocksCourt() {
        Instant start = Instant.parse("2026-10-09T18:00:00Z");
        Instant end = Instant.parse("2026-10-09T21:00:00Z");

        when(courtRepository.findById(activeCourt.getId())).thenReturn(Optional.of(activeCourt));
        when(sportRepository.findById(tennisSport.getId())).thenReturn(Optional.of(tennisSport));
        when(blackoutRepository.existsOverlapping(activeCourt.getId(), start, end)).thenReturn(false);
        when(sessionRepository.existsOverlapping(activeCourt.getId(), start, end)).thenReturn(false);

        Booking savedBlock = Booking.builder()
                .id(UUID.randomUUID())
                .court(activeCourt)
                .startAt(start)
                .endAt(end)
                .status(BookingStatus.CONFIRMED)
                .source(BookingSource.SOCIAL_BLOCK)
                .build();
        when(bookingRepository.saveAndFlush(any(Booking.class))).thenReturn(savedBlock);

        when(sessionRepository.save(any(SocialSession.class))).thenAnswer(inv -> {
            SocialSession s = inv.getArgument(0);
            s.setId(UUID.randomUUID());
            return s;
        });

        CreateSocialSessionRequest req = CreateSocialSessionRequest.builder()
                .courtId(activeCourt.getId())
                .sportId(tennisSport.getId())
                .title("Friday Night Tennis Mixer")
                .description("Open doubles round-robin")
                .startAt(start)
                .endAt(end)
                .capacity(16)
                .minParticipants(4)
                .feeMember(new BigDecimal("10.00"))
                .feeGuest(new BigDecimal("25.00"))
                .repeatWeeks(1)
                .build();

        List<SocialSessionResponse> responses = service.createSession(req, adminUser.getId());
        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).getTitle()).isEqualTo("Friday Night Tennis Mixer");
        assertThat(responses.get(0).getCapacity()).isEqualTo(16);

        verify(bookingRepository).saveAndFlush(argThat(b ->
                b.getSource() == BookingSource.SOCIAL_BLOCK &&
                b.getStatus() == BookingStatus.CONFIRMED &&
                b.getStartAt().equals(start)
        ));
    }

    @Test
    @DisplayName("Create session fails if regular booking already exists on court (DoubleBookingException)")
    void testCreateSessionCollidesWithRegularBooking() {
        Instant start = Instant.parse("2026-10-09T18:00:00Z");
        Instant end = Instant.parse("2026-10-09T21:00:00Z");

        when(courtRepository.findById(activeCourt.getId())).thenReturn(Optional.of(activeCourt));
        when(sportRepository.findById(tennisSport.getId())).thenReturn(Optional.of(tennisSport));
        when(blackoutRepository.existsOverlapping(activeCourt.getId(), start, end)).thenReturn(false);
        when(sessionRepository.existsOverlapping(activeCourt.getId(), start, end)).thenReturn(false);

        // Simulate DB GiST exclusion constraint throwing DataIntegrityViolationException
        when(bookingRepository.saveAndFlush(any(Booking.class)))
                .thenThrow(new DataIntegrityViolationException("exclusion constraint violation"));

        CreateSocialSessionRequest req = CreateSocialSessionRequest.builder()
                .courtId(activeCourt.getId())
                .sportId(tennisSport.getId())
                .title("Friday Mixer")
                .startAt(start)
                .endAt(end)
                .capacity(16)
                .build();

        assertThatThrownBy(() -> service.createSession(req, adminUser.getId()))
                .isInstanceOf(DoubleBookingException.class)
                .hasMessageContaining("already booked for a regular session");
    }

    @Test
    @DisplayName("Create session on court under maintenance is rejected")
    void testCreateSessionOnMaintenanceCourtRejected() {
        when(courtRepository.findById(maintenanceCourt.getId())).thenReturn(Optional.of(maintenanceCourt));

        CreateSocialSessionRequest req = CreateSocialSessionRequest.builder()
                .courtId(maintenanceCourt.getId())
                .sportId(tennisSport.getId())
                .title("Broken Court Session")
                .startAt(Instant.parse("2026-10-09T18:00:00Z"))
                .endAt(Instant.parse("2026-10-09T20:00:00Z"))
                .capacity(8)
                .build();

        assertThatThrownBy(() -> service.createSession(req, adminUser.getId()))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("maintenance");
    }

    @Test
    @DisplayName("Recurrence generator creates N weeks idempotently with parent series linkage")
    void testRecurrenceGenerator() {
        Instant start = Instant.parse("2026-10-09T18:00:00Z");
        Instant end = Instant.parse("2026-10-09T21:00:00Z");

        when(courtRepository.findById(activeCourt.getId())).thenReturn(Optional.of(activeCourt));
        when(sportRepository.findById(tennisSport.getId())).thenReturn(Optional.of(tennisSport));
        when(blackoutRepository.existsOverlapping(eq(activeCourt.getId()), any(Instant.class), any(Instant.class))).thenReturn(false);
        when(sessionRepository.existsOverlapping(eq(activeCourt.getId()), any(Instant.class), any(Instant.class))).thenReturn(false);

        when(bookingRepository.saveAndFlush(any(Booking.class))).thenAnswer(inv -> {
            Booking b = inv.getArgument(0);
            b.setId(UUID.randomUUID());
            return b;
        });

        when(sessionRepository.save(any(SocialSession.class))).thenAnswer(inv -> {
            SocialSession s = inv.getArgument(0);
            if (s.getId() == null) s.setId(UUID.randomUUID());
            return s;
        });

        CreateSocialSessionRequest req = CreateSocialSessionRequest.builder()
                .courtId(activeCourt.getId())
                .sportId(tennisSport.getId())
                .title("Recurring Friday Social")
                .startAt(start)
                .endAt(end)
                .capacity(12)
                .repeatWeeks(4)
                .recurrenceRule("FREQ=WEEKLY;BYDAY=FR;COUNT=4")
                .build();

        List<SocialSessionResponse> responses = service.createSession(req, adminUser.getId());
        assertThat(responses).hasSize(4);
        verify(bookingRepository, times(4)).saveAndFlush(any(Booking.class));
    }

    @Test
    @DisplayName("Gold member joins for free ($0.00) while Silver member pays member fee")
    void testJoinSessionPricingTiers() {
        UUID sessionId = UUID.randomUUID();
        SocialSession session = SocialSession.builder()
                .id(sessionId)
                .court(activeCourt)
                .sport(tennisSport)
                .title("Friday Mixer")
                .startAt(Instant.parse("2026-10-09T18:00:00Z"))
                .endAt(Instant.parse("2026-10-09T21:00:00Z"))
                .capacity(10)
                .feeMember(new BigDecimal("12.00"))
                .feeGuest(new BigDecimal("20.00"))
                .status(SocialSessionStatus.SCHEDULED)
                .allowJuniors(true)
                .build();

        when(sessionRepository.findByIdWithLock(sessionId)).thenReturn(Optional.of(session));
        when(participantRepository.findActiveBySessionAndMember(eq(sessionId), any(UUID.class))).thenReturn(Optional.empty());
        when(participantRepository.countBySessionIdAndStatus(sessionId, SocialParticipantStatus.JOINED)).thenReturn(0L);

        when(participantRepository.save(any(SocialParticipant.class))).thenAnswer(inv -> inv.getArgument(0));

        // 1. Gold member join
        when(memberRepository.findByIdAndIsDeletedFalse(activeGoldMember.getId())).thenReturn(Optional.of(activeGoldMember));
        JoinSocialSessionRequest goldReq = JoinSocialSessionRequest.builder().memberId(activeGoldMember.getId()).build();
        SocialParticipantResponse goldResp = service.joinSession(sessionId, goldReq, null);

        assertThat(goldResp.getStatus()).isEqualTo(SocialParticipantStatus.JOINED);
        assertThat(goldResp.getFeePaid()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(goldResp.getPaymentStatus()).isEqualTo(SocialPaymentStatus.WAIVED);

        // 2. Silver member join
        when(memberRepository.findByIdAndIsDeletedFalse(activeSilverMember.getId())).thenReturn(Optional.of(activeSilverMember));
        JoinSocialSessionRequest silverReq = JoinSocialSessionRequest.builder().memberId(activeSilverMember.getId()).build();
        SocialParticipantResponse silverResp = service.joinSession(sessionId, silverReq, null);

        assertThat(silverResp.getStatus()).isEqualTo(SocialParticipantStatus.JOINED);
        assertThat(silverResp.getFeePaid()).isEqualByComparingTo(new BigDecimal("12.00"));
        assertThat(silverResp.getPaymentStatus()).isEqualTo(SocialPaymentStatus.PAID);
    }

    @Test
    @DisplayName("Guest joins with phone number and name paying guest fee")
    void testGuestJoin() {
        UUID sessionId = UUID.randomUUID();
        SocialSession session = SocialSession.builder()
                .id(sessionId)
                .court(activeCourt)
                .sport(tennisSport)
                .title("Friday Mixer")
                .startAt(Instant.parse("2026-10-09T18:00:00Z"))
                .endAt(Instant.parse("2026-10-09T21:00:00Z"))
                .capacity(10)
                .feeGuest(new BigDecimal("25.00"))
                .status(SocialSessionStatus.SCHEDULED)
                .build();

        when(sessionRepository.findByIdWithLock(sessionId)).thenReturn(Optional.of(session));
        when(participantRepository.findActiveBySessionAndGuestPhone(sessionId, "+19998887777")).thenReturn(Optional.empty());
        when(participantRepository.countBySessionIdAndStatus(sessionId, SocialParticipantStatus.JOINED)).thenReturn(2L);
        when(participantRepository.save(any(SocialParticipant.class))).thenAnswer(inv -> inv.getArgument(0));

        JoinSocialSessionRequest req = JoinSocialSessionRequest.builder()
                .guestName("John Doe Walkin")
                .guestPhone("+19998887777")
                .build();

        SocialParticipantResponse resp = service.joinSession(sessionId, req, null);
        assertThat(resp.getStatus()).isEqualTo(SocialParticipantStatus.JOINED);
        assertThat(resp.getGuestName()).isEqualTo("John Doe Walkin");
        assertThat(resp.getFeePaid()).isEqualByComparingTo(new BigDecimal("25.00"));
    }

    @Test
    @DisplayName("Joining when capacity is reached assigns WAITLISTED status")
    void testJoinWhenFullGoesToWaitlist() {
        UUID sessionId = UUID.randomUUID();
        SocialSession session = SocialSession.builder()
                .id(sessionId)
                .court(activeCourt)
                .sport(tennisSport)
                .title("Full Mixer")
                .startAt(Instant.parse("2026-10-09T18:00:00Z"))
                .endAt(Instant.parse("2026-10-09T21:00:00Z"))
                .capacity(4)
                .feeMember(new BigDecimal("10.00"))
                .status(SocialSessionStatus.SCHEDULED)
                .build();

        when(sessionRepository.findByIdWithLock(sessionId)).thenReturn(Optional.of(session));
        when(memberRepository.findByIdAndIsDeletedFalse(activeSilverMember.getId())).thenReturn(Optional.of(activeSilverMember));
        when(participantRepository.findActiveBySessionAndMember(sessionId, activeSilverMember.getId())).thenReturn(Optional.empty());

        // Capacity full (4 already joined)
        when(participantRepository.countBySessionIdAndStatus(sessionId, SocialParticipantStatus.JOINED)).thenReturn(4L);
        when(participantRepository.save(any(SocialParticipant.class))).thenAnswer(inv -> inv.getArgument(0));

        JoinSocialSessionRequest req = JoinSocialSessionRequest.builder().memberId(activeSilverMember.getId()).build();
        SocialParticipantResponse resp = service.joinSession(sessionId, req, null);

        assertThat(resp.getStatus()).isEqualTo(SocialParticipantStatus.WAITLISTED);
        assertThat(resp.getPaymentStatus()).isEqualTo(SocialPaymentStatus.PENDING);
    }

    @Test
    @DisplayName("Junior without guardian is rejected from joining")
    void testJuniorWithoutGuardianRejected() {
        UUID sessionId = UUID.randomUUID();
        SocialSession session = SocialSession.builder()
                .id(sessionId)
                .court(activeCourt)
                .sport(tennisSport)
                .title("Evening Session")
                .startAt(Instant.parse("2026-10-09T17:00:00Z"))
                .endAt(Instant.parse("2026-10-09T19:00:00Z"))
                .capacity(8)
                .allowJuniors(true)
                .status(SocialSessionStatus.SCHEDULED)
                .build();

        when(sessionRepository.findByIdWithLock(sessionId)).thenReturn(Optional.of(session));
        when(memberRepository.findByIdAndIsDeletedFalse(juniorMemberNoGuardian.getId())).thenReturn(Optional.of(juniorMemberNoGuardian));

        JoinSocialSessionRequest req = JoinSocialSessionRequest.builder().memberId(juniorMemberNoGuardian.getId()).build();
        assertThatThrownBy(() -> service.joinSession(sessionId, req, null))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("guardian");
    }

    @Test
    @DisplayName("Duplicate join is prevented with ALREADY_REGISTERED error")
    void testDuplicateJoinPrevented() {
        UUID sessionId = UUID.randomUUID();
        SocialSession session = SocialSession.builder()
                .id(sessionId)
                .court(activeCourt)
                .sport(tennisSport)
                .title("Evening Session")
                .startAt(Instant.parse("2026-10-09T18:00:00Z"))
                .endAt(Instant.parse("2026-10-09T20:00:00Z"))
                .status(SocialSessionStatus.SCHEDULED)
                .build();

        when(sessionRepository.findByIdWithLock(sessionId)).thenReturn(Optional.of(session));
        when(memberRepository.findByIdAndIsDeletedFalse(activeGoldMember.getId())).thenReturn(Optional.of(activeGoldMember));

        // Member already registered
        SocialParticipant existing = SocialParticipant.builder().id(UUID.randomUUID()).status(SocialParticipantStatus.JOINED).build();
        when(participantRepository.findActiveBySessionAndMember(sessionId, activeGoldMember.getId())).thenReturn(Optional.of(existing));

        JoinSocialSessionRequest req = JoinSocialSessionRequest.builder().memberId(activeGoldMember.getId()).build();
        assertThatThrownBy(() -> service.joinSession(sessionId, req, null))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("already joined");
    }

    @Test
    @DisplayName("Leaving session auto-promotes earliest waitlisted participant (FIFO)")
    void testLeaveAutoPromotesWaitlist() {
        UUID sessionId = UUID.randomUUID();
        SocialSession session = SocialSession.builder()
                .id(sessionId)
                .court(activeCourt)
                .sport(tennisSport)
                .title("Mixer")
                .startAt(Instant.parse("2026-10-09T18:00:00Z"))
                .endAt(Instant.parse("2026-10-09T21:00:00Z"))
                .status(SocialSessionStatus.SCHEDULED)
                .build();

        UUID leaverId = UUID.randomUUID();
        SocialParticipant leaver = SocialParticipant.builder()
                .id(leaverId)
                .session(session)
                .member(activeGoldMember)
                .status(SocialParticipantStatus.JOINED)
                .paymentStatus(SocialPaymentStatus.WAIVED)
                .feePaid(BigDecimal.ZERO)
                .build();

        UUID waitlistedId = UUID.randomUUID();
        SocialParticipant waiter = SocialParticipant.builder()
                .id(waitlistedId)
                .session(session)
                .member(activeSilverMember)
                .status(SocialParticipantStatus.WAITLISTED)
                .paymentStatus(SocialPaymentStatus.PENDING)
                .feePaid(new BigDecimal("12.00"))
                .joinedAt(Instant.parse("2026-10-09T10:15:00Z"))
                .build();

        when(sessionRepository.findByIdWithLock(sessionId)).thenReturn(Optional.of(session));
        when(participantRepository.findById(leaverId)).thenReturn(Optional.of(leaver));
        when(participantRepository.findFirstBySessionIdAndStatusOrderByJoinedAtAsc(sessionId, SocialParticipantStatus.WAITLISTED))
                .thenReturn(Optional.of(waiter));

        service.leaveSession(sessionId, leaverId, null);

        // Verify leaver cancelled
        assertThat(leaver.getStatus()).isEqualTo(SocialParticipantStatus.CANCELLED);
        // Verify waiter promoted to JOINED and payment set to PAID
        assertThat(waiter.getStatus()).isEqualTo(SocialParticipantStatus.JOINED);
        assertThat(waiter.getPaymentStatus()).isEqualTo(SocialPaymentStatus.PAID);
    }

    @Test
    @DisplayName("Leaving session after start time is blocked")
    void testLeaveAfterStartBlocked() {
        UUID sessionId = UUID.randomUUID();
        SocialSession pastSession = SocialSession.builder()
                .id(sessionId)
                .court(activeCourt)
                .sport(tennisSport)
                .title("Started Mixer")
                .startAt(Instant.parse("2026-10-09T08:00:00Z")) // In the past relative to fixed clock 10:00:00Z
                .endAt(Instant.parse("2026-10-09T11:00:00Z"))
                .status(SocialSessionStatus.SCHEDULED)
                .build();

        when(sessionRepository.findByIdWithLock(sessionId)).thenReturn(Optional.of(pastSession));

        assertThatThrownBy(() -> service.leaveSession(sessionId, UUID.randomUUID(), null))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("already started");
    }

    @Test
    @DisplayName("Cancelling session frees court block and refunds participants")
    void testCancelSessionReleasesCourtAndRefunds() {
        UUID sessionId = UUID.randomUUID();
        Booking blockBooking = Booking.builder()
                .id(UUID.randomUUID())
                .status(BookingStatus.CONFIRMED)
                .build();

        SocialSession session = SocialSession.builder()
                .id(sessionId)
                .court(activeCourt)
                .sport(tennisSport)
                .title("Rain Out Mixer")
                .startAt(Instant.parse("2026-10-09T18:00:00Z"))
                .endAt(Instant.parse("2026-10-09T21:00:00Z"))
                .status(SocialSessionStatus.SCHEDULED)
                .booking(blockBooking)
                .build();

        SocialParticipant paidParticipant = SocialParticipant.builder()
                .id(UUID.randomUUID())
                .session(session)
                .member(activeSilverMember)
                .status(SocialParticipantStatus.JOINED)
                .paymentStatus(SocialPaymentStatus.PAID)
                .feePaid(new BigDecimal("15.00"))
                .build();

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(participantRepository.findBySessionIdOrderByJoinedAtAsc(sessionId)).thenReturn(List.of(paidParticipant));

        service.cancelSession(sessionId, false, "Severe Weather Warning");

        assertThat(session.getStatus()).isEqualTo(SocialSessionStatus.CANCELLED);
        assertThat(blockBooking.getStatus()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(paidParticipant.getStatus()).isEqualTo(SocialParticipantStatus.CANCELLED);
        assertThat(paidParticipant.getPaymentStatus()).isEqualTo(SocialPaymentStatus.REFUNDED);
    }
}
