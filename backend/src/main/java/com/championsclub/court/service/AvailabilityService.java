package com.championsclub.court.service;

import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.common.time.ClubTimeUtils;
import com.championsclub.court.domain.Booking;
import com.championsclub.court.domain.BookingStatus;
import com.championsclub.court.domain.Court;
import com.championsclub.court.domain.CourtBlackout;
import com.championsclub.court.domain.CourtStatus;
import com.championsclub.court.domain.OpeningHours;
import com.championsclub.court.domain.PricingRule;
import com.championsclub.court.domain.SlotHold;
import com.championsclub.court.domain.SlotState;
import com.championsclub.court.domain.Sport;
import com.championsclub.court.dto.AvailabilityResponse;
import com.championsclub.court.dto.AvailabilitySlotDto;
import com.championsclub.court.dto.CourtAvailabilityDto;
import com.championsclub.court.dto.HoldSlotRequest;
import com.championsclub.court.dto.HoldSlotResponse;
import com.championsclub.court.dto.PricingQuoteResponse;
import com.championsclub.court.repo.BookingRepository;
import com.championsclub.court.repo.CourtBlackoutRepository;
import com.championsclub.court.repo.CourtRepository;
import com.championsclub.court.repo.OpeningHoursRepository;
import com.championsclub.court.repo.PricingRuleRepository;
import com.championsclub.court.repo.SlotHoldRepository;
import com.championsclub.court.repo.SportRepository;
import com.championsclub.member.domain.Membership;
import com.championsclub.member.domain.MembershipStatus;
import com.championsclub.member.domain.Plan;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.MembershipRepository;
import com.championsclub.member.repo.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AvailabilityService {

    private static final Logger log = LoggerFactory.getLogger(AvailabilityService.class);
    private static final long CACHE_TTL_MILLIS = 5_000L; // 5 seconds
    public static final Duration HOLD_DURATION = Duration.ofMinutes(5);

    private final CourtRepository courtRepository;
    private final SportRepository sportRepository;
    private final OpeningHoursRepository openingHoursRepository;
    private final CourtBlackoutRepository blackoutRepository;
    private final BookingRepository bookingRepository;
    private final SlotHoldRepository holdRepository;
    private final PricingRuleRepository pricingRuleRepository;
    private final UserRepository userRepository;
    private final MembershipRepository membershipRepository;
    private final SlotGeneratorService slotGeneratorService;
    private final PricingResolverService pricingResolverService;
    private final AvailabilitySseHub sseHub;
    private final ClubTimeUtils timeUtils;

    // Simple thread-safe 5-second in-memory cache
    private record CacheEntry(long timestamp, AvailabilityResponse response) {}
    private final Map<String, CacheEntry> responseCache = new ConcurrentHashMap<>();

    public AvailabilityService(
            CourtRepository courtRepository,
            SportRepository sportRepository,
            OpeningHoursRepository openingHoursRepository,
            CourtBlackoutRepository blackoutRepository,
            BookingRepository bookingRepository,
            SlotHoldRepository holdRepository,
            PricingRuleRepository pricingRuleRepository,
            UserRepository userRepository,
            MembershipRepository membershipRepository,
            SlotGeneratorService slotGeneratorService,
            PricingResolverService pricingResolverService,
            AvailabilitySseHub sseHub,
            ClubTimeUtils timeUtils
    ) {
        this.courtRepository = courtRepository;
        this.sportRepository = sportRepository;
        this.openingHoursRepository = openingHoursRepository;
        this.blackoutRepository = blackoutRepository;
        this.bookingRepository = bookingRepository;
        this.holdRepository = holdRepository;
        this.pricingRuleRepository = pricingRuleRepository;
        this.userRepository = userRepository;
        this.membershipRepository = membershipRepository;
        this.slotGeneratorService = slotGeneratorService;
        this.pricingResolverService = pricingResolverService;
        this.sseHub = sseHub;
        this.timeUtils = timeUtils;
    }

    public void invalidateCache() {
        responseCache.clear();
    }

    @Transactional(readOnly = true)
    public AvailabilityResponse getAvailability(
            LocalDate date,
            UUID sportId,
            UUID courtId,
            UUID userId
    ) {
        if (date == null) {
            throw new BusinessValidationException("Date parameter is required (YYYY-MM-DD)", "MISSING_DATE");
        }

        LocalDate today = timeUtils.currentClubDate();
        if (date.isBefore(today)) {
            // Far past check
            long daysPast = ChronoUnit.DAYS.between(date, today);
            if (daysPast > 365) {
                throw new BusinessValidationException("Cannot query dates older than 1 year", "INVALID_DATE_RANGE");
            }
        }

        // Cache lookup
        String cacheKey = String.format("%s:%s:%s:%s",
                date,
                sportId != null ? sportId : "all",
                courtId != null ? courtId : "all",
                userId != null ? userId : "guest"
        );

        long nowMillis = System.currentTimeMillis();
        CacheEntry cached = responseCache.get(cacheKey);
        if (cached != null && (nowMillis - cached.timestamp()) < CACHE_TTL_MILLIS) {
            return cached.response();
        }

        Instant now = timeUtils.now();
        holdRepository.purgeExpiredHolds(now);

        // Resolve User and Plan
        User user = null;
        Plan plan = null;
        if (userId != null) {
            user = userRepository.findById(userId).filter(u -> !u.isDeleted()).orElse(null);
            if (user != null) {
                Optional<Membership> activeMem = membershipRepository
                        .findByUserIdAndActiveTrueAndIsDeletedFalse(user.getId());
                if (activeMem.isPresent()) {
                    Membership m = activeMem.get();
                    if (m.getStatus() == MembershipStatus.ACTIVE && m.isActive() &&
                            (m.getEndDate() == null || !today.isAfter(m.getEndDate()))) {
                        plan = m.getPlan();
                    }
                }
            }
        }

        // Advance booking days validation
        int advanceDaysAllowed = plan != null ? (plan.getAdvanceBookingDays() != null ? plan.getAdvanceBookingDays() : 7) : 2;
        boolean exceedsAdvanceWindow = date.isAfter(today.plusDays(advanceDaysAllowed));

        // 1. Fetch Sport info
        Sport sport = null;
        if (sportId != null) {
            sport = sportRepository.findById(sportId).filter(s -> !s.isDeleted()).orElse(null);
        }

        // 2. Query Courts (Single query)
        List<Court> courts;
        if (courtId != null) {
            Court c = courtRepository.findById(courtId)
                    .filter(ct -> !ct.isDeleted())
                    .orElseThrow(() -> new ResourceNotFoundException("Court", courtId));
            courts = List.of(c);
            if (sport == null) {
                sport = c.getSport();
            }
        } else if (sportId != null) {
            courts = courtRepository.findBySportIdAndIsDeletedFalse(sportId);
        } else {
            courts = courtRepository.findAllByIsDeletedFalseOrderByNameAsc();
        }

        if (courts.isEmpty()) {
            AvailabilityResponse emptyResp = AvailabilityResponse.builder()
                    .date(date)
                    .sportId(sportId)
                    .sportName(sport != null ? sport.getName() : "All Sports")
                    .clubTimezone(timeUtils.getClubZoneId().getId())
                    .facilityClosed(false)
                    .courts(Collections.emptyList())
                    .build();
            responseCache.put(cacheKey, new CacheEntry(nowMillis, emptyResp));
            return emptyResp;
        }

        List<UUID> courtIds = courts.stream().map(Court::getId).toList();

        // Compute day time boundaries in club timezone
        Instant dayStart = timeUtils.startOfDayInClub(date);
        Instant nextDayEnd = timeUtils.startOfDayInClub(date.plusDays(2)); // Cover midnight crossings safely

        // 3. Batch Query Opening Hours (Single query)
        List<OpeningHours> hoursRules = openingHoursRepository.findRulesForDateAndCourts(
                date, date.getDayOfWeek(), courtIds
        );

        // 4. Batch Query Blackouts (Single query)
        List<CourtBlackout> blackouts = blackoutRepository.findOverlappingBlackoutsForCourts(
                courtIds, dayStart, nextDayEnd
        );

        // 5. Batch Query Bookings (Single query)
        List<Booking> bookings = bookingRepository.findActiveBookingsForCourtsInWindow(
                courtIds, dayStart, nextDayEnd, BookingStatus.CANCELLED
        );

        // 6. Batch Query Holds (Single query)
        List<SlotHold> holds = holdRepository.findActiveHoldsForCourts(
                courtIds, dayStart, nextDayEnd, now
        );

        // 7. Check Club-wide operating window
        SlotGeneratorService.OperatingWindow clubWindow = slotGeneratorService.resolveOperatingWindow(
                null, date, hoursRules
        );

        List<CourtAvailabilityDto> courtDtos = new ArrayList<>();

        for (Court court : courts) {
            // Check court-specific operating window
            SlotGeneratorService.OperatingWindow courtWindow = slotGeneratorService.resolveOperatingWindow(
                    court, date, hoursRules
            );

            if (courtWindow.isClosed()) {
                courtDtos.add(CourtAvailabilityDto.builder()
                        .courtId(court.getId())
                        .courtName(court.getName())
                        .sportName(court.getSport() != null ? court.getSport().getName() : court.getSportType().name())
                        .surface(court.getSurface())
                        .indoor(court.getIndoor() != null && court.getIndoor())
                        .status(court.getStatus())
                        .slots(Collections.emptyList())
                        .build());
                continue;
            }

            List<SlotGeneratorService.GeneratedSlot> generatedSlots = slotGeneratorService.generateSlots(courtWindow);
            List<AvailabilitySlotDto> slotDtos = new ArrayList<>();

            for (SlotGeneratorService.GeneratedSlot genSlot : generatedSlots) {
                AvailabilitySlotDto slotDto = evaluateSlot(
                        genSlot, court, date, now, plan, userId, user,
                        exceedsAdvanceWindow, advanceDaysAllowed,
                        blackouts, bookings, holds
                );
                slotDtos.add(slotDto);
            }

            courtDtos.add(CourtAvailabilityDto.builder()
                    .courtId(court.getId())
                    .courtName(court.getName())
                    .sportName(court.getSport() != null ? court.getSport().getName() : court.getSportType().name())
                    .surface(court.getSurface())
                    .indoor(court.getIndoor() != null && court.getIndoor())
                    .status(court.getStatus())
                    .slots(slotDtos)
                    .build());
        }

        AvailabilityResponse response = AvailabilityResponse.builder()
                .date(date)
                .sportId(sport != null ? sport.getId() : sportId)
                .sportName(sport != null ? sport.getName() : "All Sports")
                .clubTimezone(timeUtils.getClubZoneId().getId())
                .facilityClosed(clubWindow.isClosed())
                .closureReason(clubWindow.closureReason())
                .courts(courtDtos)
                .build();

        responseCache.put(cacheKey, new CacheEntry(nowMillis, response));
        return response;
    }

    private AvailabilitySlotDto evaluateSlot(
            SlotGeneratorService.GeneratedSlot slot,
            Court court,
            LocalDate date,
            Instant now,
            Plan plan,
            UUID userId,
            User user,
            boolean exceedsAdvanceWindow,
            int advanceDaysAllowed,
            List<CourtBlackout> allBlackouts,
            List<Booking> allBookings,
            List<SlotHold> allHolds
    ) {
        UUID courtId = court.getId();
        Instant start = slot.startTime();
        Instant end = slot.endTime();

        SlotState state = SlotState.AVAILABLE;
        String reason = null;
        UUID matchedHoldId = null;
        UUID matchedBookingId = null;

        // 1. Check if slot has passed or is partly past
        // If slot start is in the past, user cannot book it
        if (start.isBefore(now)) {
            state = SlotState.PAST;
            reason = "Slot time has passed";
        }
        // 2. Check Court Status (MAINTENANCE / RETIRED)
        else if (court.getStatus() == CourtStatus.MAINTENANCE) {
            state = SlotState.BLOCKED;
            reason = "Court under maintenance";
        } else if (court.getStatus() == CourtStatus.RETIRED || !court.isActive()) {
            state = SlotState.BLOCKED;
            reason = "Court out of service";
        }
        // 3. Check Advance Booking Limit
        else if (exceedsAdvanceWindow) {
            state = SlotState.BLOCKED;
            reason = String.format("Exceeds advance booking window (%d days)", advanceDaysAllowed);
        }
        // 4. Check Friday Social Play Mixer (Fridays 18:00 - 22:00 for Badminton & Tennis)
        else if (isSocialPlaySlot(court, date, slot.localStartTime())) {
            state = SlotState.SOCIAL;
            reason = "Friday Social Play Mixer (Open Round-Robin)";
        }
        // 5. Check Blackouts
        else {
            Optional<CourtBlackout> blackoutMatch = allBlackouts.stream()
                    .filter(b -> b.getCourt().getId().equals(courtId) && b.getStartTime().isBefore(end) && b.getEndTime().isAfter(start))
                    .findFirst();
            if (blackoutMatch.isPresent()) {
                state = SlotState.BLOCKED;
                reason = "Blackout: " + blackoutMatch.get().getReason();
            } else {
                // 6. Check Bookings
                Optional<Booking> bookingMatch = allBookings.stream()
                        .filter(b -> b.getCourt().getId().equals(courtId) && b.getStartTime().isBefore(end) && b.getEndTime().isAfter(start))
                        .findFirst();
                if (bookingMatch.isPresent()) {
                    Booking b = bookingMatch.get();
                    if (b.getStatus() == BookingStatus.HELD) {
                        state = SlotState.HELD;
                        matchedHoldId = b.getId();
                        reason = "Cart Hold in progress";
                    } else {
                        state = SlotState.BOOKED;
                        matchedBookingId = b.getId();
                        reason = "Reserved";
                    }
                } else {
                    // 7. Check Active Holds
                    Optional<SlotHold> holdMatch = allHolds.stream()
                            .filter(h -> h.getCourt().getId().equals(courtId) && h.getStartTime().isBefore(end) && h.getEndTime().isAfter(start))
                            .findFirst();
                    if (holdMatch.isPresent()) {
                        state = SlotState.HELD;
                        matchedHoldId = holdMatch.get().getId();
                        reason = "Cart Hold in progress";
                    }
                }
            }
        }

        // Price Quote Resolution
        java.math.BigDecimal price = null;
        String formattedPrice = null;
        try {
            PricingQuoteResponse quote = pricingResolverService.resolveQuote(
                    court, start, plan, userId, user
            );
            price = quote.getPrice();
            formattedPrice = price.compareTo(java.math.BigDecimal.ZERO) == 0 ? "FREE" : "₹" + price.toPlainString();
        } catch (Exception e) {
            // In case no pricing rule is configured for this specific time
            formattedPrice = "N/A";
        }

        return AvailabilitySlotDto.builder()
                .startTime(start)
                .endTime(end)
                .localStartTime(slot.localStartTime())
                .localEndTime(slot.localEndTime())
                .state(state)
                .reason(reason)
                .price(price)
                .formattedPrice(formattedPrice)
                .holdId(matchedHoldId)
                .bookingId(matchedBookingId)
                .build();
    }

    private boolean isSocialPlaySlot(Court court, LocalDate date, LocalTime localStartTime) {
        if (date.getDayOfWeek() != DayOfWeek.FRIDAY) {
            return false;
        }
        // Dedicated Badminton and Tennis courts
        String sportName = court.getSport() != null ? court.getSport().getName() : court.getSportType().name();
        boolean isEligibleSport = "BADMINTON".equalsIgnoreCase(sportName) || "TENNIS".equalsIgnoreCase(sportName);
        if (!isEligibleSport) {
            return false;
        }

        // Friday 18:00 to 22:00
        LocalTime socialStart = LocalTime.of(18, 0);
        LocalTime socialEnd = LocalTime.of(22, 0);
        return !localStartTime.isBefore(socialStart) && localStartTime.isBefore(socialEnd);
    }

    @Transactional
    public HoldSlotResponse holdSlot(HoldSlotRequest request) {
        Court court = courtRepository.findById(request.getCourtId())
                .filter(c -> !c.isDeleted() && c.isActive())
                .orElseThrow(() -> new ResourceNotFoundException("Court", request.getCourtId()));

        Instant now = timeUtils.now();
        if (request.getStartTime().isBefore(now)) {
            throw new BusinessValidationException("Cannot hold a slot in the past", "HOLD_IN_PAST");
        }

        // Check conflicts with bookings
        List<Booking> conflicts = bookingRepository.findConflictingBookings(
                court.getId(), request.getStartTime(), request.getEndTime(), BookingStatus.CANCELLED
        );
        if (!conflicts.isEmpty()) {
            throw new BusinessValidationException("Court is already booked for this slot", "SLOT_ALREADY_BOOKED");
        }

        // Check conflicts with existing holds
        List<SlotHold> activeHolds = holdRepository.findActiveHoldsForCourt(
                court.getId(), request.getStartTime(), request.getEndTime(), now
        );
        if (!activeHolds.isEmpty()) {
            throw new BusinessValidationException("Court slot is currently held by another user", "SLOT_ALREADY_HELD");
        }

        // Check blackouts
        List<CourtBlackout> blackouts = blackoutRepository.findOverlappingBlackouts(
                court.getId(), request.getStartTime(), request.getEndTime()
        );
        if (!blackouts.isEmpty()) {
            throw new BusinessValidationException("Court is blocked for maintenance or club event", "SLOT_BLOCKED");
        }

        User user = null;
        if (request.getUserId() != null) {
            user = userRepository.findById(request.getUserId()).orElse(null);
        }

        String token = "HOLD-" + UUID.randomUUID().toString();
        Instant expiresAt = now.plus(HOLD_DURATION);

        SlotHold hold = SlotHold.builder()
                .court(court)
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .user(user)
                .holdToken(token)
                .expiresAt(expiresAt)
                .createdAt(now)
                .build();

        SlotHold saved = holdRepository.save(hold);
        invalidateCache();

        LocalDate slotDate = timeUtils.toClubLocalDate(request.getStartTime());
        sseHub.broadcastChange(slotDate.toString(), Map.of(
                "eventType", "SLOT_HELD",
                "courtId", court.getId(),
                "startTime", request.getStartTime(),
                "expiresAt", expiresAt
        ));

        return HoldSlotResponse.builder()
                .holdId(saved.getId())
                .holdToken(saved.getHoldToken())
                .courtId(court.getId())
                .startTime(saved.getStartTime())
                .endTime(saved.getEndTime())
                .expiresAt(saved.getExpiresAt())
                .build();
    }

    @Transactional
    public void releaseHold(String holdToken) {
        Instant now = timeUtils.now();
        Optional<SlotHold> holdOpt = holdRepository.findByHoldTokenAndExpiresAtAfter(holdToken, now);
        if (holdOpt.isPresent()) {
            SlotHold hold = holdOpt.get();
            LocalDate slotDate = timeUtils.toClubLocalDate(hold.getStartTime());
            holdRepository.delete(hold);
            invalidateCache();
            sseHub.broadcastChange(slotDate.toString(), Map.of(
                    "eventType", "SLOT_RELEASED",
                    "courtId", hold.getCourt().getId(),
                    "startTime", hold.getStartTime()
            ));
        }
    }
}
