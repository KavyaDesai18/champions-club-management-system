package com.championsclub.court.service;

import com.championsclub.common.error.BlackoutConflictException;
import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.common.time.ClubTimeUtils;
import com.championsclub.court.domain.Booking;
import com.championsclub.court.domain.BookingStatus;
import com.championsclub.court.domain.Court;
import com.championsclub.court.domain.CourtBlackout;
import com.championsclub.court.dto.BlackoutDto;
import com.championsclub.court.dto.ConflictingBookingDto;
import com.championsclub.court.dto.CreateBlackoutRequest;
import com.championsclub.court.repo.BookingRepository;
import com.championsclub.court.repo.CourtBlackoutRepository;
import com.championsclub.court.repo.CourtRepository;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.UserRepository;
import com.championsclub.notification.domain.NotificationType;
import com.championsclub.notification.service.NotificationDispatcher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class CourtBlackoutService {

    private static final Logger log = LoggerFactory.getLogger(CourtBlackoutService.class);

    private final CourtBlackoutRepository blackoutRepository;
    private final CourtRepository courtRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final NotificationDispatcher notificationDispatcher;
    private final AvailabilityService availabilityService;
    private final AvailabilitySseHub sseHub;
    private final ClubTimeUtils timeUtils;

    public CourtBlackoutService(
            CourtBlackoutRepository blackoutRepository,
            CourtRepository courtRepository,
            BookingRepository bookingRepository,
            UserRepository userRepository,
            NotificationDispatcher notificationDispatcher,
            AvailabilityService availabilityService,
            AvailabilitySseHub sseHub,
            ClubTimeUtils timeUtils
    ) {
        this.blackoutRepository = blackoutRepository;
        this.courtRepository = courtRepository;
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.notificationDispatcher = notificationDispatcher;
        this.availabilityService = availabilityService;
        this.sseHub = sseHub;
        this.timeUtils = timeUtils;
    }

    @Transactional
    public BlackoutDto createBlackout(CreateBlackoutRequest request, UUID adminUserId) {
        if (!request.getEndTime().isAfter(request.getStartTime())) {
            throw new BusinessValidationException("Blackout end time must be strictly after start time", "INVALID_TIME_RANGE");
        }

        Court court = courtRepository.findById(request.getCourtId())
                .filter(c -> !c.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Court", request.getCourtId()));

        User adminUser = adminUserId != null ? userRepository.findById(adminUserId).orElse(null) : null;

        // Check for conflicting active bookings
        List<Booking> conflicts = bookingRepository.findConflictingBookings(
                court.getId(), request.getStartTime(), request.getEndTime(), BookingStatus.CANCELLED
        );

        if (!conflicts.isEmpty() && !request.isConfirmCancelAndNotify()) {
            List<ConflictingBookingDto> conflictDtos = conflicts.stream()
                    .map(b -> ConflictingBookingDto.builder()
                            .bookingId(b.getId())
                            .bookingReference(b.getBookingReference())
                            .userId(b.getUser().getId())
                            .userName(b.getUser().getFullName())
                            .userEmail(b.getUser().getEmail())
                            .startTime(b.getStartTime())
                            .endTime(b.getEndTime())
                            .courtName(court.getName())
                            .build())
                    .toList();

            throw new BlackoutConflictException(
                    String.format("Found %d conflicting active booking(s) during requested blackout window. Explicit confirmation required to cancel and notify members.",
                            conflicts.size()),
                    conflictDtos
            );
        }

        // If confirmed, cancel conflicting bookings and dispatch notifications
        if (!conflicts.isEmpty() && request.isConfirmCancelAndNotify()) {
            Instant now = timeUtils.now();
            for (Booking b : conflicts) {
                b.setStatus(BookingStatus.CANCELLED);
                b.setUpdatedAt(now);
                bookingRepository.save(b);

                String msg = String.format(
                        "Your reservation for %s on %s has been cancelled due to facility maintenance: %s. Our team apologizes for the inconvenience.",
                        court.getName(), timeUtils.toClubLocalDate(b.getStartTime()), request.getReason()
                );

                try {
                    notificationDispatcher.dispatch(
                            b.getUser(),
                            null,
                            "Court Booking Cancelled - Maintenance",
                            msg,
                            NotificationType.BOOKING,
                            String.format("{\"bookingId\":\"%s\",\"court\":\"%s\",\"reason\":\"%s\"}",
                                    b.getId(), court.getName(), request.getReason())
                    );
                } catch (Exception ex) {
                    log.error("Failed to dispatch blackout cancellation notification for booking {}", b.getId(), ex);
                }
            }
        }

        Instant now = timeUtils.now();
        CourtBlackout blackout = CourtBlackout.builder()
                .court(court)
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .reason(request.getReason())
                .createdBy(adminUser)
                .createdAt(now)
                .updatedAt(now)
                .build();

        CourtBlackout saved = blackoutRepository.save(blackout);
        availabilityService.invalidateCache();

        LocalDate slotDate = timeUtils.toClubLocalDate(request.getStartTime());
        sseHub.broadcastChange(slotDate.toString(), Map.of(
                "eventType", "BLACKOUT_CREATED",
                "courtId", court.getId(),
                "startTime", request.getStartTime(),
                "endTime", request.getEndTime(),
                "reason", request.getReason()
        ));

        return mapToDto(saved);
    }

    @Transactional(readOnly = true)
    public List<BlackoutDto> getAllBlackouts() {
        return blackoutRepository.findAllByIsDeletedFalseOrderByStartTimeDesc().stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BlackoutDto> getCourtBlackouts(UUID courtId) {
        return blackoutRepository.findByCourtIdAndIsDeletedFalseOrderByStartTimeDesc(courtId).stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional
    public void deleteBlackout(UUID blackoutId) {
        CourtBlackout blackout = blackoutRepository.findById(blackoutId)
                .filter(b -> !b.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("CourtBlackout", blackoutId));

        blackout.setDeleted(true);
        blackout.setUpdatedAt(timeUtils.now());
        blackoutRepository.save(blackout);

        availabilityService.invalidateCache();
        LocalDate slotDate = timeUtils.toClubLocalDate(blackout.getStartTime());
        sseHub.broadcastChange(slotDate.toString(), Map.of(
                "eventType", "BLACKOUT_DELETED",
                "blackoutId", blackoutId,
                "courtId", blackout.getCourt().getId()
        ));
    }

    private BlackoutDto mapToDto(CourtBlackout b) {
        return BlackoutDto.builder()
                .id(b.getId())
                .courtId(b.getCourt().getId())
                .courtName(b.getCourt().getName())
                .startTime(b.getStartTime())
                .endTime(b.getEndTime())
                .reason(b.getReason())
                .createdById(b.getCreatedBy() != null ? b.getCreatedBy().getId() : null)
                .createdByName(b.getCreatedBy() != null ? b.getCreatedBy().getFullName() : "System Admin")
                .createdAt(b.getCreatedAt())
                .build();
    }
}
