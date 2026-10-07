package com.championsclub.court.service;

import com.championsclub.common.error.BlackoutConflictException;
import com.championsclub.common.time.ClubTimeUtils;
import com.championsclub.court.domain.Booking;
import com.championsclub.court.domain.BookingStatus;
import com.championsclub.court.domain.Court;
import com.championsclub.court.domain.CourtBlackout;
import com.championsclub.court.dto.BlackoutDto;
import com.championsclub.court.dto.CreateBlackoutRequest;
import com.championsclub.court.repo.BookingRepository;
import com.championsclub.court.repo.CourtBlackoutRepository;
import com.championsclub.court.repo.CourtRepository;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.UserRepository;
import com.championsclub.notification.domain.NotificationType;
import com.championsclub.notification.service.NotificationDispatcher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CourtBlackoutServiceTest {

    private CourtBlackoutRepository blackoutRepository;
    private CourtRepository courtRepository;
    private BookingRepository bookingRepository;
    private UserRepository userRepository;
    private NotificationDispatcher notificationDispatcher;
    private AvailabilityService availabilityService;
    private AvailabilitySseHub sseHub;
    private ClubTimeUtils timeUtils;
    private CourtBlackoutService blackoutService;

    private final ZoneId zoneId = ZoneId.of("Asia/Kolkata");
    private final Instant now = Instant.parse("2026-10-08T10:00:00Z");
    private final Clock clock = Clock.fixed(now, zoneId);

    private Court testCourt;
    private User testUser;
    private Booking existingBooking;

    @BeforeEach
    void setUp() {
        blackoutRepository = Mockito.mock(CourtBlackoutRepository.class);
        courtRepository = Mockito.mock(CourtRepository.class);
        bookingRepository = Mockito.mock(BookingRepository.class);
        userRepository = Mockito.mock(UserRepository.class);
        notificationDispatcher = Mockito.mock(NotificationDispatcher.class);
        availabilityService = Mockito.mock(AvailabilityService.class);
        sseHub = Mockito.mock(AvailabilitySseHub.class);

        timeUtils = new ClubTimeUtils(clock, zoneId);
        blackoutService = new CourtBlackoutService(
                blackoutRepository,
                courtRepository,
                bookingRepository,
                userRepository,
                notificationDispatcher,
                availabilityService,
                sseHub,
                timeUtils
        );

        testCourt = Court.builder()
                .id(UUID.randomUUID())
                .name("Tennis Court 1")
                .build();

        testUser = User.builder()
                .id(UUID.randomUUID())
                .fullName("John Doe")
                .email("john@example.com")
                .build();

        existingBooking = Booking.builder()
                .id(UUID.randomUUID())
                .bookingReference("BK-TEST01")
                .court(testCourt)
                .user(testUser)
                .startTime(now.plusSeconds(3600))
                .endTime(now.plusSeconds(7200))
                .status(BookingStatus.CONFIRMED)
                .build();

        when(courtRepository.findById(testCourt.getId())).thenReturn(Optional.of(testCourt));
    }

    @Test
    @DisplayName("Creating blackout with conflicting bookings throws BlackoutConflictException when confirmCancelAndNotify is false")
    void testBlackoutConflictThrowsException() {
        CreateBlackoutRequest request = CreateBlackoutRequest.builder()
                .courtId(testCourt.getId())
                .startTime(now.plusSeconds(1800))
                .endTime(now.plusSeconds(9000))
                .reason("Surface Recoating")
                .confirmCancelAndNotify(false)
                .build();

        when(bookingRepository.findConflictingBookings(eq(testCourt.getId()), any(), any(), eq(BookingStatus.CANCELLED)))
                .thenReturn(List.of(existingBooking));

        assertThatThrownBy(() -> blackoutService.createBlackout(request, UUID.randomUUID()))
                .isInstanceOf(BlackoutConflictException.class)
                .satisfies(ex -> {
                    BlackoutConflictException bce = (BlackoutConflictException) ex;
                    assertThat(bce.getConflictingBookings()).hasSize(1);
                    assertThat(bce.getConflictingBookings().get(0).getBookingReference()).isEqualTo("BK-TEST01");
                    assertThat(bce.getConflictingBookings().get(0).getUserName()).isEqualTo("John Doe");
                });

        verify(blackoutRepository, times(0)).save(any());
    }

    @Test
    @DisplayName("Creating blackout with confirmCancelAndNotify cancels conflicting bookings and dispatches notifications")
    void testBlackoutWithConfirmCancelsAndNotifies() {
        CreateBlackoutRequest request = CreateBlackoutRequest.builder()
                .courtId(testCourt.getId())
                .startTime(now.plusSeconds(1800))
                .endTime(now.plusSeconds(9000))
                .reason("Surface Recoating")
                .confirmCancelAndNotify(true)
                .build();

        when(bookingRepository.findConflictingBookings(eq(testCourt.getId()), any(), any(), eq(BookingStatus.CANCELLED)))
                .thenReturn(List.of(existingBooking));

        when(blackoutRepository.save(any())).thenAnswer(invocation -> {
            CourtBlackout b = invocation.getArgument(0);
            b.setId(UUID.randomUUID());
            return b;
        });

        BlackoutDto result = blackoutService.createBlackout(request, UUID.randomUUID());

        assertThat(result).isNotNull();
        assertThat(existingBooking.getStatus()).isEqualTo(BookingStatus.CANCELLED);

        // Verify booking cancellation was saved
        verify(bookingRepository, times(1)).save(existingBooking);

        // Verify notification dispatch
        verify(notificationDispatcher, times(1)).dispatch(
                eq(testUser),
                any(),
                eq("Court Booking Cancelled - Maintenance"),
                any(),
                eq(NotificationType.BOOKING),
                any()
        );

        // Verify cache invalidated & SSE broadcasted
        verify(availabilityService, times(1)).invalidateCache();
        verify(sseHub, times(1)).broadcastChange(any(), any());
    }
}
