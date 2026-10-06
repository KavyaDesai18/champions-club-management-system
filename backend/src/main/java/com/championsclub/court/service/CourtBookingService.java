package com.championsclub.court.service;

import com.championsclub.common.audit.AuditService;
import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.DoubleBookingException;
import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.common.money.Money;
import com.championsclub.common.time.ClubTimeUtils;
import com.championsclub.court.domain.Booking;
import com.championsclub.court.domain.BookingStatus;
import com.championsclub.court.domain.Court;
import com.championsclub.court.dto.BookingResponse;
import com.championsclub.court.dto.CourtDto;
import com.championsclub.court.dto.CreateBookingRequest;
import com.championsclub.court.repo.BookingRepository;
import com.championsclub.court.repo.CourtRepository;
import com.championsclub.member.domain.Membership;
import com.championsclub.member.domain.MembershipTier;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.MembershipRepository;
import com.championsclub.member.repo.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class CourtBookingService {

    public static final int MAX_BOOKINGS_PER_MEMBER_PER_DAY = 2;
    public static final long SESSION_DURATION_MINUTES = 60;

    private final CourtRepository courtRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final MembershipRepository membershipRepository;
    private final ClubTimeUtils timeUtils;
    private final AuditService auditService;

    public CourtBookingService(
            CourtRepository courtRepository,
            BookingRepository bookingRepository,
            UserRepository userRepository,
            MembershipRepository membershipRepository,
            ClubTimeUtils timeUtils,
            AuditService auditService
    ) {
        this.courtRepository = courtRepository;
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.membershipRepository = membershipRepository;
        this.timeUtils = timeUtils;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<CourtDto> getAllActiveCourts() {
        return courtRepository.findByIsActiveTrueAndIsDeletedFalse().stream()
                .map(this::mapToCourtDto)
                .toList();
    }

    @Transactional
    public BookingResponse createBooking(CreateBookingRequest request, String idempotencyKey, String clientIp) {
        // Idempotency check
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<Booking> existing = bookingRepository.findByIdempotencyKey(idempotencyKey);
            if (existing.isPresent()) {
                return mapToBookingResponse(existing.get());
            }
        }

        Court court = courtRepository.findById(request.getCourtId())
                .filter(c -> !c.isDeleted() && c.isActive())
                .orElseThrow(() -> new ResourceNotFoundException("Court", request.getCourtId()));

        User user = userRepository.findById(request.getUserId())
                .filter(u -> !u.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("User", request.getUserId()));

        // Business Rule: Session duration must be strictly 60 minutes
        Duration duration = Duration.between(request.getStartTime(), request.getEndTime());
        if (duration.toMinutes() != SESSION_DURATION_MINUTES) {
            throw new BusinessValidationException(
                    String.format("Session duration must be exactly %d minutes (requested: %d minutes)",
                            SESSION_DURATION_MINUTES, duration.toMinutes()),
                    "INVALID_SESSION_DURATION"
            );
        }

        // Business Rule: Slots start every 30 minutes (:00 or :30)
        ZonedDateTime startZdt = request.getStartTime().atZone(timeUtils.getClubZoneId());
        int minute = startZdt.getMinute();
        if (minute != 0 && minute != 30) {
            throw new BusinessValidationException(
                    "Court sessions must start on the hour or half-hour (:00 or :30)",
                    "INVALID_SLOT_START_TIME"
            );
        }

        // Business Rule: Start time must not be in the past
        Instant now = timeUtils.now();
        if (request.getStartTime().isBefore(now)) {
            throw new BusinessValidationException("Cannot book a court slot in the past", "BOOKING_IN_PAST");
        }

        // Business Rule: Max 2 bookings per member per day in club timezone
        LocalDate clubBookingDate = timeUtils.toClubLocalDate(request.getStartTime());
        Instant dayStart = timeUtils.startOfDayInClub(clubBookingDate);
        Instant dayEnd = timeUtils.endOfDayInClub(clubBookingDate);

        long dailyBookingsCount = bookingRepository.countBookingsForUserInDateRange(
                user.getId(), dayStart, dayEnd, BookingStatus.CANCELLED
        );

        if (dailyBookingsCount >= MAX_BOOKINGS_PER_MEMBER_PER_DAY) {
            throw new BusinessValidationException(
                    String.format("Daily booking limit reached. Members are allowed a maximum of %d bookings per day",
                            MAX_BOOKINGS_PER_MEMBER_PER_DAY),
                    "DAILY_BOOKING_QUOTA_EXCEEDED"
            );
        }

        // App-level conflict check (DB GiST exclusion constraint remains final guard)
        List<Booking> conflicts = bookingRepository.findConflictingBookings(
                court.getId(), request.getStartTime(), request.getEndTime(), BookingStatus.CANCELLED
        );
        if (!conflicts.isEmpty()) {
            throw new DoubleBookingException(
                    String.format("Court '%s' is already booked for the selected slot", court.getName())
            );
        }

        // Determine pricing based on Membership Tier vs Walk-in / Guest
        Optional<Membership> activeMembership = membershipRepository.findByUserIdAndActiveTrueAndIsDeletedFalse(user.getId());
        Money finalAmount;
        String tierApplied = "GUEST";

        if (activeMembership.isPresent()) {
            Membership membership = activeMembership.get();
            tierApplied = membership.getTier().name();
            Money baseRate = Money.of(court.getHourlyRateMember());

            if (membership.getTier() == MembershipTier.GOLD) {
                // Gold members get 25% discount on court bookings
                finalAmount = baseRate.applyDiscountPercentage(java.math.BigDecimal.valueOf(25));
            } else {
                finalAmount = baseRate;
            }
        } else {
            // Walk-in / Guest rate
            finalAmount = Money.of(court.getHourlyRateGuest());
        }

        String ref = "BK-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();

        Booking booking = Booking.builder()
                .bookingReference(ref)
                .court(court)
                .user(user)
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .status(BookingStatus.CONFIRMED)
                .totalAmount(finalAmount.getAmount())
                .tierApplied(tierApplied)
                .idempotencyKey(idempotencyKey)
                .createdAt(now)
                .updatedAt(now)
                .build();

        Booking saved = bookingRepository.save(booking);

        auditService.record(
                user.getId(),
                "CREATE_BOOKING",
                "Booking",
                saved.getId().toString(),
                String.format("Court: %s, Slot: %s to %s, Amount: %s, Tier: %s",
                        court.getName(), request.getStartTime(), request.getEndTime(), finalAmount, tierApplied),
                clientIp
        );

        return mapToBookingResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getUserBookings(UUID userId) {
        return bookingRepository.findByUserIdAndIsDeletedFalseOrderByStartTimeDesc(userId).stream()
                .map(this::mapToBookingResponse)
                .toList();
    }

    private CourtDto mapToCourtDto(Court court) {
        return CourtDto.builder()
                .id(court.getId())
                .name(court.getName())
                .sportType(court.getSportType())
                .hourlyRateMember(court.getHourlyRateMember())
                .hourlyRateGuest(court.getHourlyRateGuest())
                .active(court.isActive())
                .build();
    }

    private BookingResponse mapToBookingResponse(Booking booking) {
        return BookingResponse.builder()
                .id(booking.getId())
                .bookingReference(booking.getBookingReference())
                .courtId(booking.getCourt().getId())
                .courtName(booking.getCourt().getName())
                .sportType(booking.getCourt().getSportType())
                .userId(booking.getUser().getId())
                .userName(booking.getUser().getFullName())
                .startTime(booking.getStartTime())
                .endTime(booking.getEndTime())
                .status(booking.getStatus())
                .totalAmount(booking.getTotalAmount())
                .tierApplied(booking.getTierApplied())
                .createdAt(booking.getCreatedAt())
                .build();
    }
}
