package com.championsclub.court.service;

import com.championsclub.common.time.ClubTimeUtils;
import com.championsclub.court.domain.Booking;
import com.championsclub.court.domain.BookingStatus;
import com.championsclub.court.domain.Court;
import com.championsclub.court.domain.CourtBlackout;
import com.championsclub.court.domain.CourtStatus;
import com.championsclub.court.domain.OpeningHours;
import com.championsclub.court.domain.SlotHold;
import com.championsclub.court.domain.SlotState;
import com.championsclub.court.domain.Sport;
import com.championsclub.court.domain.SportType;
import com.championsclub.court.dto.AvailabilityResponse;
import com.championsclub.court.dto.AvailabilitySlotDto;
import com.championsclub.court.dto.CourtAvailabilityDto;
import com.championsclub.court.dto.PricingQuoteResponse;
import com.championsclub.court.repo.BookingRepository;
import com.championsclub.court.repo.CourtBlackoutRepository;
import com.championsclub.court.repo.CourtRepository;
import com.championsclub.court.repo.OpeningHoursRepository;
import com.championsclub.court.repo.PricingRuleRepository;
import com.championsclub.court.repo.SlotHoldRepository;
import com.championsclub.court.repo.SportRepository;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.MembershipRepository;
import com.championsclub.member.repo.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AvailabilityServiceTest {

    private CourtRepository courtRepository;
    private SportRepository sportRepository;
    private OpeningHoursRepository openingHoursRepository;
    private CourtBlackoutRepository blackoutRepository;
    private BookingRepository bookingRepository;
    private SlotHoldRepository holdRepository;
    private PricingRuleRepository pricingRuleRepository;
    private UserRepository userRepository;
    private MembershipRepository membershipRepository;
    private SlotGeneratorService slotGeneratorService;
    private PricingResolverService pricingResolverService;
    private AvailabilitySseHub sseHub;
    private ClubTimeUtils timeUtils;
    private AvailabilityService availabilityService;

    private final ZoneId zoneId = ZoneId.of("Asia/Kolkata");
    // Club time fixed at 12:00 PM on Friday 2026-10-09
    private final Instant nowInstant = Instant.parse("2026-10-09T06:30:00Z"); // 12:00 PM IST
    private final Clock clock = Clock.fixed(nowInstant, zoneId);

    private Court court1;
    private Court court2;
    private Sport badmintonSport;

    @BeforeEach
    void setUp() {
        courtRepository = Mockito.mock(CourtRepository.class);
        sportRepository = Mockito.mock(SportRepository.class);
        openingHoursRepository = Mockito.mock(OpeningHoursRepository.class);
        blackoutRepository = Mockito.mock(CourtBlackoutRepository.class);
        bookingRepository = Mockito.mock(BookingRepository.class);
        holdRepository = Mockito.mock(SlotHoldRepository.class);
        pricingRuleRepository = Mockito.mock(PricingRuleRepository.class);
        userRepository = Mockito.mock(UserRepository.class);
        membershipRepository = Mockito.mock(MembershipRepository.class);
        sseHub = Mockito.mock(AvailabilitySseHub.class);
        pricingResolverService = Mockito.mock(PricingResolverService.class);

        timeUtils = new ClubTimeUtils(clock, zoneId);
        slotGeneratorService = new SlotGeneratorService(timeUtils);

        availabilityService = new AvailabilityService(
                courtRepository,
                sportRepository,
                openingHoursRepository,
                blackoutRepository,
                bookingRepository,
                holdRepository,
                pricingRuleRepository,
                userRepository,
                membershipRepository,
                slotGeneratorService,
                pricingResolverService,
                sseHub,
                timeUtils
        );

        badmintonSport = Sport.builder()
                .id(UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"))
                .name("Badminton")
                .build();

        court1 = Court.builder()
                .id(UUID.fromString("c1111111-1111-1111-1111-111111111111"))
                .name("Badminton Court 1")
                .sport(badmintonSport)
                .sportType(SportType.BADMINTON)
                .surface("SYNTHETIC")
                .indoor(true)
                .status(CourtStatus.ACTIVE)
                .hourlyRateMember(BigDecimal.valueOf(15))
                .hourlyRateGuest(BigDecimal.valueOf(20))
                .build();

        court2 = Court.builder()
                .id(UUID.fromString("c2222222-2222-2222-2222-222222222222"))
                .name("Badminton Court 2")
                .sport(badmintonSport)
                .sportType(SportType.BADMINTON)
                .surface("SYNTHETIC")
                .indoor(true)
                .status(CourtStatus.ACTIVE)
                .hourlyRateMember(BigDecimal.valueOf(15))
                .hourlyRateGuest(BigDecimal.valueOf(20))
                .build();

        when(courtRepository.findById(court1.getId())).thenReturn(Optional.of(court1));
        when(courtRepository.findById(court2.getId())).thenReturn(Optional.of(court2));
    }

    @Test
    @DisplayName("Single query batch assertion: 0 N+1 repository queries when fetching availability across courts")
    void testSingleBatchQueryNoNPlusOne() {
        LocalDate date = LocalDate.of(2026, 10, 9); // Friday
        when(courtRepository.findBySportIdAndIsDeletedFalse(badmintonSport.getId()))
                .thenReturn(List.of(court1, court2));

        when(openingHoursRepository.findRulesForDateAndCourts(any(), any(), any()))
                .thenReturn(List.of(OpeningHours.builder()
                        .dayOfWeek(DayOfWeek.FRIDAY)
                        .openTime(LocalTime.of(6, 0))
                        .closeTime(LocalTime.of(23, 0))
                        .isClosed(false)
                        .build()));

        when(blackoutRepository.findOverlappingBlackoutsForCourts(any(), any(), any()))
                .thenReturn(List.of());

        when(bookingRepository.findActiveBookingsForCourtsInWindow(any(), any(), any(), any()))
                .thenReturn(List.of());

        when(holdRepository.findActiveHoldsForCourts(any(), any(), any(), any()))
                .thenReturn(List.of());

        when(pricingResolverService.resolveQuote(any(), any(), any(), any(), any()))
                .thenReturn(PricingQuoteResponse.builder()
                        .price(BigDecimal.valueOf(20.00))
                        .build());

        AvailabilityResponse response = availabilityService.getAvailability(
                date, badmintonSport.getId(), null, null
        );

        assertThat(response.getCourts()).hasSize(2);

        // Verification of single query execution (NO N+1)
        verify(courtRepository, times(1)).findBySportIdAndIsDeletedFalse(badmintonSport.getId());
        verify(openingHoursRepository, times(1)).findRulesForDateAndCourts(eq(date), eq(DayOfWeek.FRIDAY), any());
        verify(blackoutRepository, times(1)).findOverlappingBlackoutsForCourts(any(), any(), any());
        verify(bookingRepository, times(1)).findActiveBookingsForCourtsInWindow(any(), any(), any(), any());
        verify(holdRepository, times(1)).findActiveHoldsForCourts(any(), any(), any(), any());
    }

    @Test
    @DisplayName("Availability slot states reflect PAST, BOOKED, HELD, BLOCKED, SOCIAL, and AVAILABLE")
    void testSlotStateEvaluation() {
        LocalDate date = LocalDate.of(2026, 10, 9); // Friday
        when(courtRepository.findBySportIdAndIsDeletedFalse(badmintonSport.getId()))
                .thenReturn(List.of(court1));

        OpeningHours standardHours = OpeningHours.builder()
                .dayOfWeek(DayOfWeek.FRIDAY)
                .openTime(LocalTime.of(6, 0))
                .closeTime(LocalTime.of(23, 0))
                .isClosed(false)
                .build();
        when(openingHoursRepository.findRulesForDateAndCourts(any(), any(), any()))
                .thenReturn(List.of(standardHours));

        // Stub a Booking at 14:00 - 15:00
        Instant bookingStart = date.atTime(14, 0).atZone(zoneId).toInstant();
        Instant bookingEnd = date.atTime(15, 0).atZone(zoneId).toInstant();
        Booking booking = Booking.builder()
                .id(UUID.randomUUID())
                .court(court1)
                .startTime(bookingStart)
                .endTime(bookingEnd)
                .status(BookingStatus.CONFIRMED)
                .build();
        when(bookingRepository.findActiveBookingsForCourtsInWindow(any(), any(), any(), any()))
                .thenReturn(List.of(booking));

        // Stub a Hold at 15:30 - 16:30
        Instant holdStart = date.atTime(15, 30).atZone(zoneId).toInstant();
        Instant holdEnd = date.atTime(16, 30).atZone(zoneId).toInstant();
        SlotHold hold = SlotHold.builder()
                .id(UUID.randomUUID())
                .court(court1)
                .startTime(holdStart)
                .endTime(holdEnd)
                .expiresAt(nowInstant.plusSeconds(300))
                .build();
        when(holdRepository.findActiveHoldsForCourts(any(), any(), any(), any()))
                .thenReturn(List.of(hold));

        // Stub a Blackout at 16:30 - 17:30
        Instant blackoutStart = date.atTime(16, 30).atZone(zoneId).toInstant();
        Instant blackoutEnd = date.atTime(17, 30).atZone(zoneId).toInstant();
        CourtBlackout blackout = CourtBlackout.builder()
                .id(UUID.randomUUID())
                .court(court1)
                .startTime(blackoutStart)
                .endTime(blackoutEnd)
                .reason("Net Cable Repair")
                .build();
        when(blackoutRepository.findOverlappingBlackoutsForCourts(any(), any(), any()))
                .thenReturn(List.of(blackout));

        when(pricingResolverService.resolveQuote(any(), any(), any(), any(), any()))
                .thenReturn(PricingQuoteResponse.builder()
                        .price(BigDecimal.valueOf(20.00))
                        .build());

        AvailabilityResponse response = availabilityService.getAvailability(
                date, badmintonSport.getId(), court1.getId(), null
        );

        CourtAvailabilityDto courtDto = response.getCourts().get(0);
        List<AvailabilitySlotDto> slots = courtDto.getSlots();

        // 1. PAST: 10:00 AM slot is before current time (12:00 PM IST)
        AvailabilitySlotDto pastSlot = slots.stream()
                .filter(s -> s.getLocalStartTime().equals(LocalTime.of(10, 0)))
                .findFirst().orElseThrow();
        assertThat(pastSlot.getState()).isEqualTo(SlotState.PAST);

        // 2. AVAILABLE: 13:00 PM slot (future, unreserved)
        AvailabilitySlotDto availSlot = slots.stream()
                .filter(s -> s.getLocalStartTime().equals(LocalTime.of(13, 0)))
                .findFirst().orElseThrow();
        assertThat(availSlot.getState()).isEqualTo(SlotState.AVAILABLE);

        // 3. BOOKED: 14:00 PM slot
        AvailabilitySlotDto bookedSlot = slots.stream()
                .filter(s -> s.getLocalStartTime().equals(LocalTime.of(14, 0)))
                .findFirst().orElseThrow();
        assertThat(bookedSlot.getState()).isEqualTo(SlotState.BOOKED);
        assertThat(bookedSlot.getBookingId()).isEqualTo(booking.getId());

        // 4. HELD: 15:30 PM slot
        AvailabilitySlotDto heldSlot = slots.stream()
                .filter(s -> s.getLocalStartTime().equals(LocalTime.of(15, 30)))
                .findFirst().orElseThrow();
        assertThat(heldSlot.getState()).isEqualTo(SlotState.HELD);
        assertThat(heldSlot.getHoldId()).isEqualTo(hold.getId());

        // 5. BLOCKED: 16:30 PM slot (Blackout)
        AvailabilitySlotDto blockedSlot = slots.stream()
                .filter(s -> s.getLocalStartTime().equals(LocalTime.of(16, 30)))
                .findFirst().orElseThrow();
        assertThat(blockedSlot.getState()).isEqualTo(SlotState.BLOCKED);
        assertThat(blockedSlot.getReason()).contains("Net Cable Repair");

        // 6. SOCIAL: 18:00 - 22:00 Friday Social Mixer on Badminton court
        AvailabilitySlotDto socialSlot = slots.stream()
                .filter(s -> s.getLocalStartTime().equals(LocalTime.of(18, 0)))
                .findFirst().orElseThrow();
        assertThat(socialSlot.getState()).isEqualTo(SlotState.SOCIAL);
        assertThat(socialSlot.getReason()).contains("Friday Social Play Mixer");
    }

    @Test
    @DisplayName("5-second in-memory caching returns cached instance without re-querying repositories")
    void testFiveSecondCache() {
        LocalDate date = LocalDate.of(2026, 10, 9);
        when(courtRepository.findBySportIdAndIsDeletedFalse(badmintonSport.getId()))
                .thenReturn(List.of(court1));
        when(openingHoursRepository.findRulesForDateAndCourts(any(), any(), any()))
                .thenReturn(List.of());
        when(blackoutRepository.findOverlappingBlackoutsForCourts(any(), any(), any()))
                .thenReturn(List.of());
        when(bookingRepository.findActiveBookingsForCourtsInWindow(any(), any(), any(), any()))
                .thenReturn(List.of());
        when(holdRepository.findActiveHoldsForCourts(any(), any(), any(), any()))
                .thenReturn(List.of());

        // 1st invocation
        AvailabilityResponse resp1 = availabilityService.getAvailability(date, badmintonSport.getId(), null, null);
        // 2nd invocation (within 5 seconds)
        AvailabilityResponse resp2 = availabilityService.getAvailability(date, badmintonSport.getId(), null, null);

        assertThat(resp1).isSameAs(resp2);
        // Verify courtRepository was only called once thanks to cache!
        verify(courtRepository, times(1)).findBySportIdAndIsDeletedFalse(badmintonSport.getId());

        // Now invalidate cache and call again
        availabilityService.invalidateCache();
        AvailabilityResponse resp3 = availabilityService.getAvailability(date, badmintonSport.getId(), null, null);

        assertThat(resp3).isNotNull();
        verify(courtRepository, times(2)).findBySportIdAndIsDeletedFalse(badmintonSport.getId());
    }
}
