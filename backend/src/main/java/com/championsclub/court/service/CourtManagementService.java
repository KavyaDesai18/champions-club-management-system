package com.championsclub.court.service;

import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.common.time.ClubTimeUtils;
import com.championsclub.court.domain.Booking;
import com.championsclub.court.domain.BookingStatus;
import com.championsclub.court.domain.Court;
import com.championsclub.court.domain.CourtStatus;
import com.championsclub.court.domain.OpeningHours;
import com.championsclub.court.domain.PricingRule;
import com.championsclub.court.domain.Sport;
import com.championsclub.court.domain.SportType;
import com.championsclub.court.dto.ConflictingBookingDto;
import com.championsclub.court.dto.CourtDetailDto;
import com.championsclub.court.dto.CreateCourtRequest;
import com.championsclub.court.dto.CreateOpeningHoursRequest;
import com.championsclub.court.dto.CreatePricingRuleRequest;
import com.championsclub.court.dto.OpeningHoursDto;
import com.championsclub.court.dto.PricingRuleDto;
import com.championsclub.court.dto.UpdateCourtRequest;
import com.championsclub.court.repo.BookingRepository;
import com.championsclub.court.repo.CourtRepository;
import com.championsclub.court.repo.OpeningHoursRepository;
import com.championsclub.court.repo.PricingRuleRepository;
import com.championsclub.court.repo.SportRepository;
import com.championsclub.member.domain.Plan;
import com.championsclub.member.repo.PlanRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class CourtManagementService {

    private static final Logger log = LoggerFactory.getLogger(CourtManagementService.class);

    private final CourtRepository courtRepository;
    private final SportRepository sportRepository;
    private final OpeningHoursRepository openingHoursRepository;
    private final PricingRuleRepository pricingRuleRepository;
    private final BookingRepository bookingRepository;
    private final PlanRepository planRepository;
    private final AvailabilityService availabilityService;
    private final AvailabilitySseHub sseHub;
    private final ClubTimeUtils timeUtils;

    public CourtManagementService(
            CourtRepository courtRepository,
            SportRepository sportRepository,
            OpeningHoursRepository openingHoursRepository,
            PricingRuleRepository pricingRuleRepository,
            BookingRepository bookingRepository,
            PlanRepository planRepository,
            AvailabilityService availabilityService,
            AvailabilitySseHub sseHub,
            ClubTimeUtils timeUtils
    ) {
        this.courtRepository = courtRepository;
        this.sportRepository = sportRepository;
        this.openingHoursRepository = openingHoursRepository;
        this.pricingRuleRepository = pricingRuleRepository;
        this.bookingRepository = bookingRepository;
        this.planRepository = planRepository;
        this.availabilityService = availabilityService;
        this.sseHub = sseHub;
        this.timeUtils = timeUtils;
    }

    // --- COURTS CRUD ---

    @Transactional(readOnly = true)
    public List<CourtDetailDto> getAllCourts() {
        return courtRepository.findAllByIsDeletedFalseOrderByNameAsc().stream()
                .map(court -> mapToCourtDetail(court, Collections.emptyList()))
                .toList();
    }

    @Transactional(readOnly = true)
    public CourtDetailDto getCourtById(UUID courtId) {
        Court court = courtRepository.findById(courtId)
                .filter(c -> !c.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Court", courtId));

        List<Booking> futureBookings = bookingRepository.findFutureActiveBookingsForCourt(
                courtId, timeUtils.now(), BookingStatus.CANCELLED
        );

        List<ConflictingBookingDto> bookingDtos = futureBookings.stream()
                .map(this::mapToBookingDto)
                .toList();

        return mapToCourtDetail(court, bookingDtos);
    }

    @Transactional
    public CourtDetailDto createCourt(CreateCourtRequest request) {
        Sport sport = null;
        if (request.getSportId() != null) {
            sport = sportRepository.findById(request.getSportId())
                    .filter(s -> !s.isDeleted())
                    .orElseThrow(() -> new ResourceNotFoundException("Sport", request.getSportId()));
        } else if (request.getSportType() != null) {
            sport = sportRepository.findByNameIgnoreCaseAndIsDeletedFalse(request.getSportType().name())
                    .orElse(null);
        }

        SportType sportType = request.getSportType() != null
                ? request.getSportType()
                : (sport != null ? SportType.valueOf(sport.getName().toUpperCase()) : SportType.BADMINTON);

        Instant now = timeUtils.now();
        Court court = Court.builder()
                .name(request.getName().trim())
                .sport(sport)
                .sportType(sportType)
                .surface(request.getSurface() != null ? request.getSurface() : "SYNTHETIC")
                .indoor(request.getIndoor() != null ? request.getIndoor() : true)
                .status(request.getStatus() != null ? request.getStatus() : CourtStatus.ACTIVE)
                .hourlyRateMember(request.getHourlyRateMember())
                .hourlyRateGuest(request.getHourlyRateGuest())
                .isActive(request.getStatus() == CourtStatus.ACTIVE)
                .createdAt(now)
                .updatedAt(now)
                .isDeleted(false)
                .build();

        Court saved = courtRepository.save(court);
        availabilityService.invalidateCache();
        sseHub.broadcastChange("all", Map.of("eventType", "COURT_CREATED", "courtId", saved.getId()));

        return mapToCourtDetail(saved, Collections.emptyList());
    }

    @Transactional
    public CourtDetailDto updateCourt(UUID courtId, UpdateCourtRequest request) {
        Court court = courtRepository.findById(courtId)
                .filter(c -> !c.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Court", courtId));

        CourtStatus oldStatus = court.getStatus();
        if (request.getName() != null && !request.getName().isBlank()) {
            court.setName(request.getName().trim());
        }
        if (request.getSportId() != null) {
            Sport sport = sportRepository.findById(request.getSportId())
                    .filter(s -> !s.isDeleted())
                    .orElseThrow(() -> new ResourceNotFoundException("Sport", request.getSportId()));
            court.setSport(sport);
        }
        if (request.getSurface() != null) {
            court.setSurface(request.getSurface());
        }
        if (request.getIndoor() != null) {
            court.setIndoor(request.getIndoor());
        }
        if (request.getStatus() != null) {
            court.setStatus(request.getStatus());
            court.setActive(request.getStatus() == CourtStatus.ACTIVE);
        }
        if (request.getHourlyRateMember() != null) {
            court.setHourlyRateMember(request.getHourlyRateMember());
        }
        if (request.getHourlyRateGuest() != null) {
            court.setHourlyRateGuest(request.getHourlyRateGuest());
        }
        if (request.getActive() != null) {
            court.setActive(request.getActive());
        }

        court.setUpdatedAt(timeUtils.now());
        Court updated = courtRepository.save(court);

        // Edge case: court moved to MAINTENANCE or RETIRED with future bookings
        List<Booking> futureBookings = Collections.emptyList();
        if (oldStatus == CourtStatus.ACTIVE &&
                (updated.getStatus() == CourtStatus.MAINTENANCE || updated.getStatus() == CourtStatus.RETIRED)) {
            futureBookings = bookingRepository.findFutureActiveBookingsForCourt(
                    courtId, timeUtils.now(), BookingStatus.CANCELLED
            );
            if (!futureBookings.isEmpty()) {
                log.warn("Court '{}' ({}) was switched to {} with {} active future bookings!",
                        updated.getName(), updated.getId(), updated.getStatus(), futureBookings.size());
            }
        }

        availabilityService.invalidateCache();
        sseHub.broadcastChange("all", Map.of("eventType", "COURT_UPDATED", "courtId", updated.getId()));

        List<ConflictingBookingDto> bookingDtos = futureBookings.stream()
                .map(this::mapToBookingDto)
                .toList();

        return mapToCourtDetail(updated, bookingDtos);
    }

    @Transactional
    public void deleteCourt(UUID courtId) {
        Court court = courtRepository.findById(courtId)
                .filter(c -> !c.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Court", courtId));

        court.setDeleted(true);
        court.setActive(false);
        court.setDeletedAt(timeUtils.now());
        court.setUpdatedAt(timeUtils.now());
        courtRepository.save(court);

        availabilityService.invalidateCache();
        sseHub.broadcastChange("all", Map.of("eventType", "COURT_DELETED", "courtId", courtId));
    }

    // --- SPORTS CRUD ---

    @Transactional(readOnly = true)
    public List<Sport> getAllSports() {
        return sportRepository.findAllByIsDeletedFalseOrderByNameAsc();
    }

    @Transactional
    public Sport createSport(String name, int defaultSessionMinutes) {
        Instant now = timeUtils.now();
        Sport sport = Sport.builder()
                .name(name.trim())
                .defaultSessionMinutes(defaultSessionMinutes > 0 ? defaultSessionMinutes : 60)
                .isActive(true)
                .createdAt(now)
                .updatedAt(now)
                .isDeleted(false)
                .build();
        return sportRepository.save(sport);
    }

    // --- OPENING HOURS CRUD ---

    @Transactional(readOnly = true)
    public List<OpeningHoursDto> getAllOpeningHours() {
        return openingHoursRepository.findAllByIsDeletedFalseOrderBySpecificDateAscDayOfWeekAsc().stream()
                .map(this::mapToHoursDto)
                .toList();
    }

    @Transactional
    public OpeningHoursDto createOpeningHours(CreateOpeningHoursRequest request) {
        Court court = null;
        if (request.getCourtId() != null) {
            court = courtRepository.findById(request.getCourtId())
                    .filter(c -> !c.isDeleted())
                    .orElseThrow(() -> new ResourceNotFoundException("Court", request.getCourtId()));
        }

        Instant now = timeUtils.now();
        OpeningHours hours = OpeningHours.builder()
                .court(court)
                .dayOfWeek(request.getDayOfWeek())
                .specificDate(request.getSpecificDate())
                .openTime(request.getOpenTime())
                .closeTime(request.getCloseTime())
                .isClosed(request.getIsClosed() != null && request.getIsClosed())
                .reason(request.getReason())
                .createdAt(now)
                .updatedAt(now)
                .isDeleted(false)
                .build();

        OpeningHours saved = openingHoursRepository.save(hours);
        availabilityService.invalidateCache();
        sseHub.broadcastChange("all", Map.of("eventType", "HOURS_UPDATED"));

        return mapToHoursDto(saved);
    }

    @Transactional
    public void deleteOpeningHours(UUID id) {
        OpeningHours hours = openingHoursRepository.findById(id)
                .filter(h -> !h.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("OpeningHours", id));

        hours.setDeleted(true);
        hours.setUpdatedAt(timeUtils.now());
        openingHoursRepository.save(hours);

        availabilityService.invalidateCache();
        sseHub.broadcastChange("all", Map.of("eventType", "HOURS_UPDATED"));
    }

    // --- PRICING RULES CRUD ---

    @Transactional(readOnly = true)
    public List<PricingRuleDto> getAllPricingRules() {
        return pricingRuleRepository.findAllByIsDeletedFalseOrderByPriorityDescCreatedAtDesc().stream()
                .map(this::mapToPricingRuleDto)
                .toList();
    }

    @Transactional
    public PricingRuleDto createPricingRule(CreatePricingRuleRequest request) {
        Sport sport = null;
        if (request.getSportId() != null) {
            sport = sportRepository.findById(request.getSportId())
                    .filter(s -> !s.isDeleted())
                    .orElseThrow(() -> new ResourceNotFoundException("Sport", request.getSportId()));
        }

        Plan plan = null;
        if (request.getPlanId() != null) {
            plan = planRepository.findById(request.getPlanId())
                    .orElseThrow(() -> new ResourceNotFoundException("Plan", request.getPlanId()));
        }

        if (request.getValidFrom() != null && request.getValidTo() != null &&
                request.getValidTo().isBefore(request.getValidFrom())) {
            throw new BusinessValidationException("validTo cannot be before validFrom", "INVALID_DATE_RANGE");
        }

        Instant now = timeUtils.now();
        PricingRule rule = PricingRule.builder()
                .sport(sport)
                .plan(plan)
                .dayType(request.getDayType())
                .timeBand(request.getTimeBand())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .price(request.getPrice())
                .priority(request.getPriority())
                .validFrom(request.getValidFrom())
                .validTo(request.getValidTo())
                .isActive(request.getActive() != null ? request.getActive() : true)
                .createdAt(now)
                .updatedAt(now)
                .isDeleted(false)
                .build();

        PricingRule saved = pricingRuleRepository.save(rule);
        availabilityService.invalidateCache();

        return mapToPricingRuleDto(saved);
    }

    @Transactional
    public void deletePricingRule(UUID ruleId) {
        PricingRule rule = pricingRuleRepository.findById(ruleId)
                .filter(r -> !r.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("PricingRule", ruleId));

        rule.setDeleted(true);
        rule.setUpdatedAt(timeUtils.now());
        pricingRuleRepository.save(rule);

        availabilityService.invalidateCache();
    }

    // --- MAPPERS ---

    private CourtDetailDto mapToCourtDetail(Court court, List<ConflictingBookingDto> futureBookings) {
        return CourtDetailDto.builder()
                .id(court.getId())
                .name(court.getName())
                .sportId(court.getSport() != null ? court.getSport().getId() : null)
                .sportName(court.getSport() != null ? court.getSport().getName() : court.getSportType().name())
                .sportType(court.getSportType())
                .surface(court.getSurface())
                .indoor(court.getIndoor() != null && court.getIndoor())
                .status(court.getStatus())
                .hourlyRateMember(court.getHourlyRateMember())
                .hourlyRateGuest(court.getHourlyRateGuest())
                .active(court.isActive())
                .createdAt(court.getCreatedAt())
                .updatedAt(court.getUpdatedAt())
                .futureActiveBookings(futureBookings)
                .build();
    }

    private ConflictingBookingDto mapToBookingDto(Booking b) {
        return ConflictingBookingDto.builder()
                .bookingId(b.getId())
                .bookingReference(b.getBookingReference())
                .userId(b.getUser().getId())
                .userName(b.getUser().getFullName())
                .userEmail(b.getUser().getEmail())
                .startTime(b.getStartTime())
                .endTime(b.getEndTime())
                .courtName(b.getCourt().getName())
                .build();
    }

    private OpeningHoursDto mapToHoursDto(OpeningHours h) {
        return OpeningHoursDto.builder()
                .id(h.getId())
                .courtId(h.getCourt() != null ? h.getCourt().getId() : null)
                .courtName(h.getCourt() != null ? h.getCourt().getName() : "Club-Wide")
                .dayOfWeek(h.getDayOfWeek())
                .specificDate(h.getSpecificDate())
                .openTime(h.getOpenTime())
                .closeTime(h.getCloseTime())
                .isClosed(h.isClosed())
                .reason(h.getReason())
                .build();
    }

    private PricingRuleDto mapToPricingRuleDto(PricingRule r) {
        return PricingRuleDto.builder()
                .id(r.getId())
                .sportId(r.getSport() != null ? r.getSport().getId() : null)
                .sportName(r.getSport() != null ? r.getSport().getName() : "All Sports")
                .planId(r.getPlan() != null ? r.getPlan().getId() : null)
                .planCode(r.getPlan() != null ? r.getPlan().getCode() : "WALK_IN_GUEST")
                .planName(r.getPlan() != null ? r.getPlan().getName() : "Walk-in / Guest")
                .dayType(r.getDayType())
                .timeBand(r.getTimeBand())
                .startTime(r.getStartTime())
                .endTime(r.getEndTime())
                .price(r.getPrice())
                .priority(r.getPriority())
                .validFrom(r.getValidFrom())
                .validTo(r.getValidTo())
                .active(r.isActive())
                .build();
    }
}
