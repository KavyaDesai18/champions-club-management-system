package com.championsclub.court.service;

import com.championsclub.common.audit.AuditService;
import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.time.ClubTimeUtils;
import com.championsclub.court.domain.Booking;
import com.championsclub.court.domain.Court;
import com.championsclub.court.domain.SportType;
import com.championsclub.court.dto.BookingResponse;
import com.championsclub.court.dto.CreateBookingRequest;
import com.championsclub.court.repo.BookingRepository;
import com.championsclub.court.repo.CourtRepository;
import com.championsclub.member.domain.Membership;
import com.championsclub.member.domain.MembershipTier;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.MembershipRepository;
import com.championsclub.member.repo.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CourtBookingServiceTest {

    @Mock
    private CourtRepository courtRepository;

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private MembershipRepository membershipRepository;

    @Mock
    private AuditService auditService;

    private ClubTimeUtils timeUtils;
    private CourtBookingService service;

    private final ZoneId zoneId = ZoneId.of("Asia/Kolkata");
    // Reference base time: 2026-10-06 08:00 UTC (13:30 IST)
    private final Instant baseTime = Instant.parse("2026-10-06T08:00:00Z");

    @BeforeEach
    void setUp() {
        Clock fixedClock = Clock.fixed(baseTime, zoneId);
        timeUtils = new ClubTimeUtils(fixedClock, zoneId);
        service = new CourtBookingService(
                courtRepository,
                bookingRepository,
                userRepository,
                membershipRepository,
                timeUtils,
                auditService
        );
    }

    @Test
    @DisplayName("Should reject booking if duration is not 60 minutes")
    void testRejectsNon60MinDuration() {
        UUID courtId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        Court court = Court.builder().id(courtId).name("Badminton 1").isActive(true).build();
        User user = User.builder().id(userId).fullName("Test Player").build();

        when(courtRepository.findById(courtId)).thenReturn(Optional.of(court));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        Instant start = Instant.parse("2026-10-07T09:00:00Z");
        Instant end = Instant.parse("2026-10-07T09:45:00Z"); // 45 min duration

        CreateBookingRequest request = CreateBookingRequest.builder()
                .courtId(courtId)
                .userId(userId)
                .startTime(start)
                .endTime(end)
                .build();

        assertThatThrownBy(() -> service.createBooking(request, "idemp-1", "127.0.0.1"))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Session duration must be exactly 60 minutes");
    }

    @Test
    @DisplayName("Should reject booking if slot start minute is not :00 or :30 in club timezone")
    void testRejectsInvalidSlotStartMinute() {
        UUID courtId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        Court court = Court.builder().id(courtId).name("Badminton 1").isActive(true).build();
        User user = User.builder().id(userId).fullName("Test Player").build();

        when(courtRepository.findById(courtId)).thenReturn(Optional.of(court));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        // In Asia/Kolkata (+05:30), 09:15 UTC is 14:45 IST -> minute 45 (not 00 or 30)
        Instant start = Instant.parse("2026-10-07T09:15:00Z");
        Instant end = Instant.parse("2026-10-07T10:15:00Z");

        CreateBookingRequest request = CreateBookingRequest.builder()
                .courtId(courtId)
                .userId(userId)
                .startTime(start)
                .endTime(end)
                .build();

        assertThatThrownBy(() -> service.createBooking(request, "idemp-2", "127.0.0.1"))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("must start on the hour or half-hour");
    }

    @Test
    @DisplayName("Should reject booking if member exceeds 2 bookings per day")
    void testRejectsExceedingDailyQuota() {
        UUID courtId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        Court court = Court.builder().id(courtId).name("Badminton 1").isActive(true).build();
        User user = User.builder().id(userId).fullName("Test Player").build();

        when(courtRepository.findById(courtId)).thenReturn(Optional.of(court));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        // 09:00 UTC = 14:30 IST (valid :30 start)
        Instant start = Instant.parse("2026-10-07T09:00:00Z");
        Instant end = Instant.parse("2026-10-07T10:00:00Z");

        when(bookingRepository.countBookingsForUserInDateRange(eq(userId), any(), any(), any()))
                .thenReturn(2L); // Already has 2 bookings today

        CreateBookingRequest request = CreateBookingRequest.builder()
                .courtId(courtId)
                .userId(userId)
                .startTime(start)
                .endTime(end)
                .build();

        assertThatThrownBy(() -> service.createBooking(request, "idemp-3", "127.0.0.1"))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Daily booking limit reached");
    }

    @Test
    @DisplayName("Should successfully book court with Gold tier 25% discount")
    void testGoldTierDiscountApplied() {
        UUID courtId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        Court court = Court.builder()
                .id(courtId)
                .name("Badminton 1")
                .sportType(SportType.BADMINTON)
                .hourlyRateMember(new BigDecimal("100.00"))
                .hourlyRateGuest(new BigDecimal("150.00"))
                .isActive(true)
                .build();

        User user = User.builder().id(userId).fullName("Gold Member").build();

        Membership goldMembership = Membership.builder()
                .id(UUID.randomUUID())
                .user(user)
                .tier(MembershipTier.GOLD)
                .active(true)
                .build();

        when(courtRepository.findById(courtId)).thenReturn(Optional.of(court));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(bookingRepository.countBookingsForUserInDateRange(eq(userId), any(), any(), any()))
                .thenReturn(0L);
        when(bookingRepository.findConflictingBookings(eq(courtId), any(), any(), any()))
                .thenReturn(Collections.emptyList());
        when(membershipRepository.findByUserIdAndActiveTrueAndIsDeletedFalse(userId))
                .thenReturn(Optional.of(goldMembership));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> {
            Booking b = invocation.getArgument(0);
            b.setId(UUID.randomUUID());
            return b;
        });

        // 09:30 UTC = 15:00 IST (valid :00 start)
        Instant start = Instant.parse("2026-10-07T09:30:00Z");
        Instant end = Instant.parse("2026-10-07T10:30:00Z");

        CreateBookingRequest request = CreateBookingRequest.builder()
                .courtId(courtId)
                .userId(userId)
                .startTime(start)
                .endTime(end)
                .build();

        BookingResponse response = service.createBooking(request, "idemp-gold-1", "127.0.0.1");

        assertThat(response).isNotNull();
        // Base rate 100.00 with 25% discount = 75.00
        assertThat(response.getTotalAmount()).isEqualByComparingTo(new BigDecimal("75.00"));
        assertThat(response.getTierApplied()).isEqualTo("GOLD");
        verify(auditService).record(eq(userId), eq("CREATE_BOOKING"), eq("Booking"), any(), any(), eq("127.0.0.1"));
    }
}
