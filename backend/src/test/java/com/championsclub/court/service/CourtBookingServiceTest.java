package com.championsclub.court.service;

import com.championsclub.common.audit.AuditService;
import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.DoubleBookingException;
import com.championsclub.common.time.ClubTimeUtils;
import com.championsclub.court.domain.Booking;
import com.championsclub.court.domain.BookingSource;
import com.championsclub.court.domain.BookingStatus;
import com.championsclub.court.domain.BookingWaitlist;
import com.championsclub.court.domain.Court;
import com.championsclub.court.domain.CourtBlackout;
import com.championsclub.court.domain.CourtStatus;
import com.championsclub.court.domain.OpeningHours;
import com.championsclub.court.domain.PaymentStatus;
import com.championsclub.court.domain.WaitlistStatus;
import com.championsclub.court.dto.BookingResponse;
import com.championsclub.court.dto.CancelBookingRequest;
import com.championsclub.court.dto.CreateBookingRequest;
import com.championsclub.court.dto.ParticipantDto;
import com.championsclub.court.dto.PricingQuoteResponse;
import com.championsclub.court.dto.RescheduleRequest;
import com.championsclub.court.dto.JoinWaitlistRequest;
import com.championsclub.court.dto.WaitlistResponse;
import com.championsclub.court.repo.BookingParticipantRepository;
import com.championsclub.court.repo.BookingRepository;
import com.championsclub.court.repo.BookingWaitlistRepository;
import com.championsclub.court.repo.CourtBlackoutRepository;
import com.championsclub.court.repo.CourtRepository;
import com.championsclub.court.repo.OpeningHoursRepository;
import com.championsclub.member.domain.Guardian;
import com.championsclub.member.domain.Member;
import com.championsclub.member.domain.MemberStatus;
import com.championsclub.member.domain.Plan;
import com.championsclub.member.domain.User;
import com.championsclub.common.security.Role;
import com.championsclub.member.repo.MemberRepository;
import com.championsclub.member.repo.UserRepository;
import com.championsclub.notification.service.NotificationDispatcher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CourtBookingServiceTest {

    @Mock
    private CourtRepository courtRepository;

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private BookingParticipantRepository participantRepository;

    @Mock
    private BookingWaitlistRepository waitlistRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private OpeningHoursRepository openingHoursRepository;

    @Mock
    private CourtBlackoutRepository blackoutRepository;

    @Mock
    private PricingResolverService pricingResolverService;

    @Mock
    private AuditService auditService;

    @Mock
    private AvailabilitySseHub sseHub;

    @Mock
    private NotificationDispatcher notificationDispatcher;

    private ClubTimeUtils timeUtils;
    private CourtBookingService service;

    private final ZoneId zoneId = ZoneId.of("Asia/Kolkata");
    // Base time: 2026-10-06 08:00 UTC (13:30 IST)
    private final Instant baseTime = Instant.parse("2026-10-06T08:00:00Z");

    private Court testCourt;
    private Plan goldPlan;
    private Plan silverPlan;
    private Member testMember;
    private User testUser;

    @BeforeEach
    void setUp() {
        Clock fixedClock = Clock.fixed(baseTime, zoneId);
        timeUtils = new ClubTimeUtils(fixedClock, zoneId);

        service = new CourtBookingService(
                courtRepository,
                bookingRepository,
                participantRepository,
                waitlistRepository,
                userRepository,
                memberRepository,
                openingHoursRepository,
                blackoutRepository,
                pricingResolverService,
                timeUtils,
                auditService,
                sseHub,
                notificationDispatcher
        );

        testCourt = Court.builder()
                .id(UUID.randomUUID())
                .name("Badminton Court 1")
                .status(CourtStatus.ACTIVE)
                .isActive(true)
                .hourlyRateMember(BigDecimal.valueOf(15.00))
                .hourlyRateGuest(BigDecimal.valueOf(20.00))
                .build();

        goldPlan = Plan.builder()
                .id(UUID.randomUUID())
                .code("GOLD")
                .name("Gold VIP")
                .advanceBookingDays(14)
                .maxBookingsPerDay(2)
                .build();

        silverPlan = Plan.builder()
                .id(UUID.randomUUID())
                .code("SILVER")
                .name("Silver Ace")
                .advanceBookingDays(7)
                .maxBookingsPerDay(2)
                .build();

        testUser = User.builder()
                .id(UUID.randomUUID())
                .fullName("Rahul Dravid")
                .role(Role.MEMBER)
                .build();

        testMember = Member.builder()
                .id(UUID.randomUUID())
                .memberNo("CC-00100")
                .fullName("Rahul Dravid")
                .status(MemberStatus.ACTIVE)
                .plan(goldPlan)
                .user(testUser)
                .startDate(LocalDate.of(2026, 1, 1))
                .endDate(LocalDate.of(2026, 12, 31))
                .dob(LocalDate.of(1990, 1, 1))
                .build();
    }

    private void stubStandardOpeningHours() {
        OpeningHours hours = OpeningHours.builder()
                .openTime(LocalTime.of(6, 0))
                .closeTime(LocalTime.of(23, 0))
                .isClosed(false)
                .build();
        when(openingHoursRepository.findRulesForDateAndCourts(any(), any(), any()))
                .thenReturn(List.of(hours));
    }

    @Test
    @DisplayName("Duration must be strictly 60 minutes")
    void testRejectsInvalidDuration() {
        when(courtRepository.findById(testCourt.getId())).thenReturn(Optional.of(testCourt));

        Instant start = Instant.parse("2026-10-07T09:00:00Z");
        Instant end = Instant.parse("2026-10-07T09:45:00Z"); // 45 min

        CreateBookingRequest request = CreateBookingRequest.builder()
                .courtId(testCourt.getId())
                .memberId(testMember.getId())
                .startTime(start)
                .endTime(end)
                .build();

        assertThatThrownBy(() -> service.createBooking(request, null, "127.0.0.1"))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Session duration must be exactly 60 minutes");
    }

    @Test
    @DisplayName("Slot must start on :00 or :30")
    void testRejectsInvalidStartMinute() {
        when(courtRepository.findById(testCourt.getId())).thenReturn(Optional.of(testCourt));

        // 09:15 UTC -> 14:45 IST (:45 is invalid)
        Instant start = Instant.parse("2026-10-07T09:15:00Z");
        Instant end = start.plus(60, ChronoUnit.MINUTES);

        CreateBookingRequest request = CreateBookingRequest.builder()
                .courtId(testCourt.getId())
                .memberId(testMember.getId())
                .startTime(start)
                .endTime(end)
                .build();

        assertThatThrownBy(() -> service.createBooking(request, null, "127.0.0.1"))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining(":00 or :30");
    }

    @Test
    @DisplayName("Cannot book a court slot in the past beyond grace")
    void testRejectsPastSlot() {
        when(courtRepository.findById(testCourt.getId())).thenReturn(Optional.of(testCourt));

        Instant pastStart = baseTime.minus(2, ChronoUnit.HOURS);
        Instant pastEnd = pastStart.plus(60, ChronoUnit.MINUTES);

        CreateBookingRequest request = CreateBookingRequest.builder()
                .courtId(testCourt.getId())
                .memberId(testMember.getId())
                .startTime(pastStart)
                .endTime(pastEnd)
                .build();

        assertThatThrownBy(() -> service.createBooking(request, null, "127.0.0.1"))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Cannot book a court slot in the past");
    }

    @Test
    @DisplayName("Court in MAINTENANCE cannot be booked")
    void testRejectsMaintenanceCourt() {
        testCourt.setStatus(CourtStatus.MAINTENANCE);
        when(courtRepository.findById(testCourt.getId())).thenReturn(Optional.of(testCourt));

        Instant start = Instant.parse("2026-10-07T10:00:00Z");
        CreateBookingRequest request = CreateBookingRequest.builder()
                .courtId(testCourt.getId())
                .memberId(testMember.getId())
                .startTime(start)
                .build();

        assertThatThrownBy(() -> service.createBooking(request, null, "127.0.0.1"))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("not active");
    }

    @Test
    @DisplayName("Court with overlapping blackout is blocked")
    void testRejectsBlackoutedSlot() {
        stubStandardOpeningHours();
        when(courtRepository.findById(testCourt.getId())).thenReturn(Optional.of(testCourt));

        Instant start = Instant.parse("2026-10-07T10:00:00Z");
        Instant end = start.plus(60, ChronoUnit.MINUTES);

        when(blackoutRepository.findOverlappingBlackouts(testCourt.getId(), start, end))
                .thenReturn(List.of(CourtBlackout.builder().reason("Annual Floor Resurfacing").build()));

        CreateBookingRequest request = CreateBookingRequest.builder()
                .courtId(testCourt.getId())
                .memberId(testMember.getId())
                .startTime(start)
                .endTime(end)
                .build();

        assertThatThrownBy(() -> service.createBooking(request, null, "127.0.0.1"))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Annual Floor Resurfacing");
    }

    @Test
    @DisplayName("Suspended member cannot book courts")
    void testRejectsSuspendedMember() {
        stubStandardOpeningHours();
        when(courtRepository.findById(testCourt.getId())).thenReturn(Optional.of(testCourt));
        when(blackoutRepository.findOverlappingBlackouts(any(), any(), any())).thenReturn(Collections.emptyList());

        testMember.setStatus(MemberStatus.SUSPENDED);
        when(memberRepository.findByIdWithLock(testMember.getId())).thenReturn(Optional.of(testMember));

        Instant start = Instant.parse("2026-10-07T10:00:00Z");
        CreateBookingRequest request = CreateBookingRequest.builder()
                .courtId(testCourt.getId())
                .memberId(testMember.getId())
                .startTime(start)
                .build();

        assertThatThrownBy(() -> service.createBooking(request, null, "127.0.0.1"))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("suspended");
    }

    @Test
    @DisplayName("Booking after membership end date is blocked with renew CTA")
    void testRejectsBookingAfterMembershipExpiry() {
        stubStandardOpeningHours();
        when(courtRepository.findById(testCourt.getId())).thenReturn(Optional.of(testCourt));
        when(blackoutRepository.findOverlappingBlackouts(any(), any(), any())).thenReturn(Collections.emptyList());

        // Membership expires on Oct 10, booking requested for Oct 15
        testMember.setEndDate(LocalDate.of(2026, 10, 10));
        when(memberRepository.findByIdWithLock(testMember.getId())).thenReturn(Optional.of(testMember));

        // 2026-10-15 10:00 UTC
        Instant start = Instant.parse("2026-10-15T10:00:00Z");
        CreateBookingRequest request = CreateBookingRequest.builder()
                .courtId(testCourt.getId())
                .memberId(testMember.getId())
                .startTime(start)
                .source(BookingSource.ONLINE)
                .build();

        assertThatThrownBy(() -> service.createBooking(request, null, "127.0.0.1"))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Membership expires on 2026-10-10. Please renew your membership");
    }

    @Test
    @DisplayName("Exceeding plan advance booking window is rejected")
    void testRejectsExceedingAdvanceDays() {
        stubStandardOpeningHours();
        when(courtRepository.findById(testCourt.getId())).thenReturn(Optional.of(testCourt));
        when(blackoutRepository.findOverlappingBlackouts(any(), any(), any())).thenReturn(Collections.emptyList());

        // Silver plan has 7 days advance limit. Base date is Oct 6. Oct 20 is 14 days ahead!
        testMember.setPlan(silverPlan);
        when(memberRepository.findByIdWithLock(testMember.getId())).thenReturn(Optional.of(testMember));

        Instant start = Instant.parse("2026-10-20T10:00:00Z");
        CreateBookingRequest request = CreateBookingRequest.builder()
                .courtId(testCourt.getId())
                .memberId(testMember.getId())
                .startTime(start)
                .build();

        assertThatThrownBy(() -> service.createBooking(request, null, "127.0.0.1"))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("exceeds your membership plan advance booking window (7 days)");
    }

    @Test
    @DisplayName("Max 2 active bookings per day quota enforced")
    void testEnforcesMaxTwoBookingsPerDay() {
        stubStandardOpeningHours();
        when(courtRepository.findById(testCourt.getId())).thenReturn(Optional.of(testCourt));
        when(blackoutRepository.findOverlappingBlackouts(any(), any(), any())).thenReturn(Collections.emptyList());
        when(memberRepository.findByIdWithLock(testMember.getId())).thenReturn(Optional.of(testMember));

        // Member already has 2 active bookings for Oct 7
        when(bookingRepository.countBookingsForMemberInDateRange(any(), any(), any(), any(), any()))
                .thenReturn(2L);

        Instant start = Instant.parse("2026-10-07T10:00:00Z");
        CreateBookingRequest request = CreateBookingRequest.builder()
                .courtId(testCourt.getId())
                .memberId(testMember.getId())
                .startTime(start)
                .build();

        assertThatThrownBy(() -> service.createBooking(request, null, "127.0.0.1"))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Daily booking limit reached. Members are allowed a maximum of 2 active bookings per day");
    }

    @Test
    @DisplayName("Cancelling a booking frees quota and allows booking again")
    void testCancellingFreesQuota() {
        stubStandardOpeningHours();
        when(courtRepository.findById(testCourt.getId())).thenReturn(Optional.of(testCourt));
        when(blackoutRepository.findOverlappingBlackouts(any(), any(), any())).thenReturn(Collections.emptyList());
        when(memberRepository.findByIdWithLock(testMember.getId())).thenReturn(Optional.of(testMember));

        // After cancelling one, member now has 1 active booking
        when(bookingRepository.countBookingsForMemberInDateRange(any(), any(), any(), any(), any()))
                .thenReturn(1L);
        when(bookingRepository.findOverlappingBookingsForMember(any(), any(), any(), any(), any()))
                .thenReturn(Collections.emptyList());
        when(bookingRepository.findConflictingBookings(any(), any(), any(), any()))
                .thenReturn(Collections.emptyList());

        when(pricingResolverService.resolveQuote(any(), any(), any(), any(), any()))
                .thenReturn(PricingQuoteResponse.builder().price(BigDecimal.ZERO).planCode("GOLD").build());

        when(bookingRepository.saveAndFlush(any())).thenAnswer(inv -> {
            Booking b = inv.getArgument(0);
            b.setId(UUID.randomUUID());
            return b;
        });

        Instant start = Instant.parse("2026-10-07T10:00:00Z");
        CreateBookingRequest request = CreateBookingRequest.builder()
                .courtId(testCourt.getId())
                .memberId(testMember.getId())
                .startTime(start)
                .build();

        BookingResponse response = service.createBooking(request, null, "127.0.0.1");
        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo(BookingStatus.HELD);
    }

    @Test
    @DisplayName("No overlapping bookings for the same member at the same time on different courts")
    void testRejectsSameMemberConcurrentBookingsOnDifferentCourts() {
        stubStandardOpeningHours();
        when(courtRepository.findById(testCourt.getId())).thenReturn(Optional.of(testCourt));
        when(blackoutRepository.findOverlappingBlackouts(any(), any(), any())).thenReturn(Collections.emptyList());
        when(memberRepository.findByIdWithLock(testMember.getId())).thenReturn(Optional.of(testMember));
        when(bookingRepository.countBookingsForMemberInDateRange(any(), any(), any(), any(), any())).thenReturn(1L);

        Court court2 = Court.builder().id(UUID.randomUUID()).name("Tennis Court 1").build();
        Booking existingBooking = Booking.builder().court(court2).build();

        Instant start = Instant.parse("2026-10-07T10:00:00Z");
        Instant end = start.plus(60, ChronoUnit.MINUTES);

        when(bookingRepository.findOverlappingBookingsForMember(eq(testMember.getId()), any(), eq(start), eq(end), any()))
                .thenReturn(List.of(existingBooking));

        CreateBookingRequest request = CreateBookingRequest.builder()
                .courtId(testCourt.getId())
                .memberId(testMember.getId())
                .startTime(start)
                .endTime(end)
                .build();

        assertThatThrownBy(() -> service.createBooking(request, null, "127.0.0.1"))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Member already has a court reserved (Tennis Court 1)");
    }

    @Test
    @DisplayName("Junior athlete requires guardian on file")
    void testJuniorRequiresGuardian() {
        stubStandardOpeningHours();
        when(courtRepository.findById(testCourt.getId())).thenReturn(Optional.of(testCourt));
        when(blackoutRepository.findOverlappingBlackouts(any(), any(), any())).thenReturn(Collections.emptyList());

        // Minor DOB (15 years old)
        testMember.setDob(LocalDate.of(2011, 5, 10));
        testMember.setGuardian(null);
        when(memberRepository.findByIdWithLock(testMember.getId())).thenReturn(Optional.of(testMember));
        when(bookingRepository.countBookingsForMemberInDateRange(any(), any(), any(), any(), any())).thenReturn(0L);
        when(bookingRepository.findOverlappingBookingsForMember(any(), any(), any(), any(), any())).thenReturn(Collections.emptyList());

        Instant start = Instant.parse("2026-10-07T10:00:00Z");
        CreateBookingRequest request = CreateBookingRequest.builder()
                .courtId(testCourt.getId())
                .memberId(testMember.getId())
                .startTime(start)
                .build();

        assertThatThrownBy(() -> service.createBooking(request, null, "127.0.0.1"))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Junior athletes require a parent/guardian on file");
    }

    @Test
    @DisplayName("Double-click / retry with same Idempotency-Key returns same booking")
    void testIdempotentRetryReturnsSameBooking() {
        String idemKey = "idem-test-key-123";
        Booking existing = Booking.builder()
                .id(UUID.randomUUID())
                .bookingReference("BK-EXISTING")
                .court(testCourt)
                .member(testMember)
                .startAt(Instant.parse("2026-10-07T10:00:00Z"))
                .endAt(Instant.parse("2026-10-07T11:00:00Z"))
                .status(BookingStatus.CONFIRMED)
                .price(BigDecimal.valueOf(15.00))
                .idempotencyKey(idemKey)
                .build();

        when(bookingRepository.findByIdempotencyKey(idemKey)).thenReturn(Optional.of(existing));

        CreateBookingRequest request = CreateBookingRequest.builder()
                .courtId(testCourt.getId())
                .memberId(testMember.getId())
                .startTime(existing.getStartAt())
                .build();

        BookingResponse response = service.createBooking(request, idemKey, "127.0.0.1");
        assertThat(response).isNotNull();
        assertThat(response.getBookingReference()).isEqualTo("BK-EXISTING");
        verify(courtRepository, never()).findById(any());
    }

    @Test
    @DisplayName("Hold creates 5-minute HELD booking and confirm converts to CONFIRMED")
    void testHoldAndConfirmFlow() {
        stubStandardOpeningHours();
        when(courtRepository.findById(testCourt.getId())).thenReturn(Optional.of(testCourt));
        when(blackoutRepository.findOverlappingBlackouts(any(), any(), any())).thenReturn(Collections.emptyList());
        when(memberRepository.findByIdWithLock(testMember.getId())).thenReturn(Optional.of(testMember));
        when(bookingRepository.countBookingsForMemberInDateRange(any(), any(), any(), any(), any())).thenReturn(0L);
        when(bookingRepository.findOverlappingBookingsForMember(any(), any(), any(), any(), any())).thenReturn(Collections.emptyList());
        when(bookingRepository.findConflictingBookings(any(), any(), any(), any())).thenReturn(Collections.emptyList());

        when(pricingResolverService.resolveQuote(any(), any(), any(), any(), any()))
                .thenReturn(PricingQuoteResponse.builder().price(BigDecimal.valueOf(15.00)).planCode("GOLD").build());

        when(bookingRepository.saveAndFlush(any())).thenAnswer(inv -> {
            Booking b = inv.getArgument(0);
            b.setId(UUID.randomUUID());
            return b;
        });

        Instant start = Instant.parse("2026-10-07T10:00:00Z");
        CreateBookingRequest request = CreateBookingRequest.builder()
                .courtId(testCourt.getId())
                .memberId(testMember.getId())
                .startTime(start)
                .source(BookingSource.ONLINE)
                .isHold(true)
                .build();

        // 1. Create Hold
        BookingResponse holdResponse = service.createBooking(request, "hold-key-1", "127.0.0.1");
        assertThat(holdResponse.getStatus()).isEqualTo(BookingStatus.HELD);
        assertThat(holdResponse.getHoldExpiresAt()).isNotNull();

        // 2. Confirm Hold
        Booking heldEntity = Booking.builder()
                .id(holdResponse.getId())
                .court(testCourt)
                .member(testMember)
                .user(testUser)
                .startAt(start)
                .endAt(start.plus(60, ChronoUnit.MINUTES))
                .status(BookingStatus.HELD)
                .holdExpiresAt(baseTime.plus(5, ChronoUnit.MINUTES))
                .price(BigDecimal.valueOf(15.00))
                .build();

        when(bookingRepository.findById(heldEntity.getId())).thenReturn(Optional.of(heldEntity));
        when(bookingRepository.save(any())).thenReturn(heldEntity);

        BookingResponse confirmedResponse = service.confirmBooking(heldEntity.getId(), null, "127.0.0.1", testUser);
        assertThat(confirmedResponse.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(confirmedResponse.getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
    }

    @Test
    @DisplayName("Confirming an expired hold throws HOLD_EXPIRED")
    void testConfirmExpiredHoldThrows() {
        Booking expiredHeld = Booking.builder()
                .id(UUID.randomUUID())
                .court(testCourt)
                .status(BookingStatus.HELD)
                // Expired 1 minute ago
                .holdExpiresAt(baseTime.minus(1, ChronoUnit.MINUTES))
                .build();

        when(bookingRepository.findById(expiredHeld.getId())).thenReturn(Optional.of(expiredHeld));

        assertThatThrownBy(() -> service.confirmBooking(expiredHeld.getId(), null, "127.0.0.1", testUser))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Slot hold has expired");
    }

    @Test
    @DisplayName("Cancel booking after start time is rejected")
    void testCannotCancelAfterStartTime() {
        Booking startedBooking = Booking.builder()
                .id(UUID.randomUUID())
                .court(testCourt)
                .status(BookingStatus.CONFIRMED)
                .user(testUser)
                // Started 30 min ago
                .startAt(baseTime.minus(30, ChronoUnit.MINUTES))
                .endAt(baseTime.plus(30, ChronoUnit.MINUTES))
                .build();

        when(bookingRepository.findById(startedBooking.getId())).thenReturn(Optional.of(startedBooking));

        assertThatThrownBy(() -> service.cancelBooking(startedBooking.getId(), null, null, "127.0.0.1", testUser))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Cannot cancel a court booking that has already started");
    }

    @Test
    @DisplayName("Member cannot cancel someone else's booking (403 Forbidden)")
    void testCannotCancelSomeoneElsesBooking() {
        User otherUser = User.builder().id(UUID.randomUUID()).role(Role.MEMBER).build();
        Booking booking = Booking.builder()
                .id(UUID.randomUUID())
                .court(testCourt)
                .status(BookingStatus.CONFIRMED)
                .user(otherUser)
                .startAt(baseTime.plus(2, ChronoUnit.DAYS))
                .endAt(baseTime.plus(2, ChronoUnit.DAYS).plus(60, ChronoUnit.MINUTES))
                .build();

        when(bookingRepository.findById(booking.getId())).thenReturn(Optional.of(booking));

        // testUser is not otherUser and not staff
        assertThatThrownBy(() -> service.cancelBooking(booking.getId(), null, null, "127.0.0.1", testUser))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("do not have permission");
    }

    @Test
    @DisplayName("Reschedule into taken slot leaves original intact (atomic transaction rollback)")
    void testAtomicRescheduleRollback() {
        stubStandardOpeningHours();
        Booking oldBooking = Booking.builder()
                .id(UUID.randomUUID())
                .court(testCourt)
                .status(BookingStatus.CONFIRMED)
                .member(testMember)
                .user(testUser)
                .startAt(baseTime.plus(1, ChronoUnit.DAYS))
                .endAt(baseTime.plus(1, ChronoUnit.DAYS).plus(60, ChronoUnit.MINUTES))
                .build();

        when(bookingRepository.findById(oldBooking.getId())).thenReturn(Optional.of(oldBooking));
        when(memberRepository.findByIdWithLock(testMember.getId())).thenReturn(Optional.of(testMember));

        // Target court is taken!
        Court targetCourt = Court.builder().id(UUID.randomUUID()).name("Badminton 2").isActive(true).status(CourtStatus.ACTIVE).build();
        when(courtRepository.findById(targetCourt.getId())).thenReturn(Optional.of(targetCourt));

        Instant newStart = baseTime.plus(2, ChronoUnit.DAYS);
        Instant newEnd = newStart.plus(60, ChronoUnit.MINUTES);

        when(bookingRepository.findConflictingBookings(eq(targetCourt.getId()), eq(newStart), eq(newEnd), any()))
                .thenReturn(List.of(Booking.builder().status(BookingStatus.CONFIRMED).build()));

        RescheduleRequest request = RescheduleRequest.builder()
                .newCourtId(targetCourt.getId())
                .newStartTime(newStart)
                .newEndTime(newEnd)
                .reason("Change to later slot")
                .build();

        assertThatThrownBy(() -> service.rescheduleBooking(oldBooking.getId(), request, null, "127.0.0.1", testUser))
                .isInstanceOf(DoubleBookingException.class);

        // Old booking status was never modified to CANCELLED!
        assertThat(oldBooking.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
    }

    @Test
    @DisplayName("Waitlist promotion upon cancellation (FIFO order)")
    void testWaitlistFifoPromotion() {
        Booking booking = Booking.builder()
                .id(UUID.randomUUID())
                .court(testCourt)
                .status(BookingStatus.CONFIRMED)
                .user(testUser)
                .startAt(baseTime.plus(2, ChronoUnit.DAYS))
                .endAt(baseTime.plus(2, ChronoUnit.DAYS).plus(60, ChronoUnit.MINUTES))
                .build();

        when(bookingRepository.findById(booking.getId())).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any())).thenReturn(booking);

        Member waitingMember = Member.builder()
                .id(UUID.randomUUID())
                .fullName("Sunil Gavaskar")
                .plan(silverPlan)
                .user(User.builder().id(UUID.randomUUID()).build())
                .build();

        BookingWaitlist waitlistEntry = BookingWaitlist.builder()
                .id(UUID.randomUUID())
                .court(testCourt)
                .startAt(booking.getStartAt())
                .endAt(booking.getEndAt())
                .member(waitingMember)
                .status(WaitlistStatus.WAITING)
                .createdAt(baseTime.minus(1, ChronoUnit.HOURS))
                .build();

        when(waitlistRepository.findActiveWaitlistForSlot(testCourt.getId(), booking.getStartAt(), WaitlistStatus.WAITING))
                .thenReturn(List.of(waitlistEntry));

        // Cancel booking
        service.cancelBooking(booking.getId(), null, null, "127.0.0.1", testUser);

        // Verify waitlist was offered and a HELD reservation was created for Sunil
        assertThat(waitlistEntry.getStatus()).isEqualTo(WaitlistStatus.OFFERED);
        assertThat(waitlistEntry.getHoldExpiresAt()).isNotNull();
        verify(notificationDispatcher).dispatch(any(), eq(waitingMember), anyString(), anyString(), any(), anyString());
    }

    @Test
    @DisplayName("Guest booking with matching member phone returns suggestion")
    void testGuestBookingSuggestsMemberLink() {
        stubStandardOpeningHours();
        when(courtRepository.findById(testCourt.getId())).thenReturn(Optional.of(testCourt));
        when(blackoutRepository.findOverlappingBlackouts(any(), any(), any())).thenReturn(Collections.emptyList());
        when(bookingRepository.findConflictingBookings(any(), any(), any(), any())).thenReturn(Collections.emptyList());

        // Guest enters phone "9876543210" which matches testMember
        when(memberRepository.findByPhoneAndIsDeletedFalse("9876543210")).thenReturn(Optional.of(testMember));

        when(pricingResolverService.resolveQuote(any(), any(), any(), any(), any()))
                .thenReturn(PricingQuoteResponse.builder().price(BigDecimal.valueOf(20.00)).planCode("GUEST").build());

        when(bookingRepository.saveAndFlush(any())).thenAnswer(inv -> {
            Booking b = inv.getArgument(0);
            b.setId(UUID.randomUUID());
            return b;
        });

        Instant start = Instant.parse("2026-10-07T10:00:00Z");
        CreateBookingRequest request = CreateBookingRequest.builder()
                .courtId(testCourt.getId())
                .guestName("Guest Walker")
                .guestPhone("9876543210")
                .startTime(start)
                .source(BookingSource.WALK_IN)
                .isHold(false)
                .build();

        BookingResponse response = service.createBooking(request, null, "127.0.0.1");
        assertThat(response).isNotNull();
        assertThat(response.getSuggestedMemberId()).isEqualTo(testMember.getId());
        assertThat(response.getSuggestedMemberName()).isEqualTo("Rahul Dravid");
        assertThat(response.getSuggestedMemberNo()).isEqualTo("CC-00100");
    }

    @Test
    @DisplayName("Co-players: guest participant incurs guest fee and owner quota is used")
    void testCoPlayersWithGuestFee() {
        stubStandardOpeningHours();
        when(courtRepository.findById(testCourt.getId())).thenReturn(Optional.of(testCourt));
        when(blackoutRepository.findOverlappingBlackouts(any(), any(), any())).thenReturn(Collections.emptyList());
        when(memberRepository.findByIdWithLock(testMember.getId())).thenReturn(Optional.of(testMember));
        when(bookingRepository.countBookingsForMemberInDateRange(any(), any(), any(), any(), any())).thenReturn(0L);
        when(bookingRepository.findOverlappingBookingsForMember(any(), any(), any(), any(), any())).thenReturn(Collections.emptyList());
        when(bookingRepository.findConflictingBookings(any(), any(), any(), any())).thenReturn(Collections.emptyList());

        when(pricingResolverService.resolveQuote(any(), any(), any(), any(), any()))
                .thenReturn(PricingQuoteResponse.builder().price(BigDecimal.valueOf(15.00)).planCode("GOLD").build());

        when(bookingRepository.saveAndFlush(any())).thenAnswer(inv -> {
            Booking b = inv.getArgument(0);
            b.setId(UUID.randomUUID());
            return b;
        });

        ParticipantDto guestPlayer = ParticipantDto.builder()
                .guestName("Guest Friend")
                .guestPhone("9998887776")
                .isGuest(true)
                .fee(BigDecimal.valueOf(5.00))
                .build();

        Instant start = Instant.parse("2026-10-07T10:00:00Z");
        CreateBookingRequest request = CreateBookingRequest.builder()
                .courtId(testCourt.getId())
                .memberId(testMember.getId())
                .startTime(start)
                .source(BookingSource.ONLINE)
                .participants(List.of(guestPlayer))
                .build();

        BookingResponse response = service.createBooking(request, null, "127.0.0.1");
        assertThat(response).isNotNull();
        // 15.00 base + 5.00 guest fee = 20.00 total
        assertThat(response.getPrice()).isEqualByComparingTo(BigDecimal.valueOf(20.00));
        assertThat(response.getParticipants()).hasSize(1);
    }
}
