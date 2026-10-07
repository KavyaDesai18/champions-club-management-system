package com.championsclub.court.service;

import com.championsclub.common.audit.AuditService;
import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.DoubleBookingException;
import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.common.time.ClubTimeUtils;
import com.championsclub.court.domain.Booking;
import com.championsclub.court.domain.BookingParticipant;
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
import com.championsclub.court.dto.CourtDto;
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
import com.championsclub.member.domain.Member;
import com.championsclub.member.domain.MemberStatus;
import com.championsclub.member.domain.User;
import com.championsclub.common.security.Role;
import com.championsclub.member.repo.MemberRepository;
import com.championsclub.member.repo.UserRepository;
import com.championsclub.notification.domain.NotificationType;
import com.championsclub.notification.service.NotificationDispatcher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class CourtBookingService {

    private static final Logger log = LoggerFactory.getLogger(CourtBookingService.class);

    public static final int MAX_BOOKINGS_PER_MEMBER_PER_DAY = 2;
    public static final long SESSION_DURATION_MINUTES = 60;
    public static final int HOLD_DURATION_MINUTES = 5;
    public static final int WAITLIST_HOLD_MINUTES = 10;
    public static final int CANCELLATION_CUTOFF_HOURS = 12;
    public static final int PAST_GRACE_MINUTES = 5;
    public static final BigDecimal DEFAULT_GUEST_FEE = BigDecimal.valueOf(5.00);

    private final CourtRepository courtRepository;
    private final BookingRepository bookingRepository;
    private final BookingParticipantRepository participantRepository;
    private final BookingWaitlistRepository waitlistRepository;
    private final UserRepository userRepository;
    private final MemberRepository memberRepository;
    private final OpeningHoursRepository openingHoursRepository;
    private final CourtBlackoutRepository blackoutRepository;
    private final PricingResolverService pricingResolverService;
    private final ClubTimeUtils timeUtils;
    private final AuditService auditService;
    private final AvailabilitySseHub sseHub;
    private final NotificationDispatcher notificationDispatcher;

    public CourtBookingService(
            CourtRepository courtRepository,
            BookingRepository bookingRepository,
            BookingParticipantRepository participantRepository,
            BookingWaitlistRepository waitlistRepository,
            UserRepository userRepository,
            MemberRepository memberRepository,
            OpeningHoursRepository openingHoursRepository,
            CourtBlackoutRepository blackoutRepository,
            PricingResolverService pricingResolverService,
            ClubTimeUtils timeUtils,
            AuditService auditService,
            AvailabilitySseHub sseHub,
            NotificationDispatcher notificationDispatcher
    ) {
        this.courtRepository = courtRepository;
        this.bookingRepository = bookingRepository;
        this.participantRepository = participantRepository;
        this.waitlistRepository = waitlistRepository;
        this.userRepository = userRepository;
        this.memberRepository = memberRepository;
        this.openingHoursRepository = openingHoursRepository;
        this.blackoutRepository = blackoutRepository;
        this.pricingResolverService = pricingResolverService;
        this.timeUtils = timeUtils;
        this.auditService = auditService;
        this.sseHub = sseHub;
        this.notificationDispatcher = notificationDispatcher;
    }

    @Transactional(readOnly = true)
    public List<CourtDto> getAllActiveCourts() {
        return courtRepository.findByIsActiveTrueAndIsDeletedFalse().stream()
                .map(this::mapToCourtDto)
                .toList();
    }

    @Transactional
    public BookingResponse createBooking(CreateBookingRequest request, String idempotencyKey, String clientIp) {
        return createBookingInternal(request, idempotencyKey, clientIp, null);
    }

    @Transactional
    public BookingResponse createBooking(CreateBookingRequest request, String idempotencyKey, String clientIp, User caller) {
        return createBookingInternal(request, idempotencyKey, clientIp, caller);
    }

    private BookingResponse createBookingInternal(CreateBookingRequest request, String idempotencyKey, String clientIp, User caller) {
        // 1. Idempotency Check
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<Booking> existing = bookingRepository.findByIdempotencyKey(idempotencyKey);
            if (existing.isPresent()) {
                return mapToBookingResponse(existing.get(), null);
            }
        }

        // 2. Validate Court
        Court court = courtRepository.findById(request.getCourtId())
                .filter(c -> !c.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Court", request.getCourtId()));

        if (court.getStatus() != CourtStatus.ACTIVE || !court.isActive()) {
            throw new BusinessValidationException(
                    String.format("Court '%s' is not active (Status: %s)", court.getName(), court.getStatus()),
                    "COURT_NOT_ACTIVE"
            );
        }

        // 3. Validate Times & Session Shape
        Instant startAt = request.getStartTime();
        Instant endAt = request.getEndTime() != null ? request.getEndTime() : startAt.plus(SESSION_DURATION_MINUTES, ChronoUnit.MINUTES);

        Duration duration = Duration.between(startAt, endAt);
        if (duration.toMinutes() != SESSION_DURATION_MINUTES) {
            throw new BusinessValidationException(
                    String.format("Session duration must be exactly %d minutes (requested: %d minutes)",
                            SESSION_DURATION_MINUTES, duration.toMinutes()),
                    "INVALID_SESSION_DURATION"
            );
        }

        ZonedDateTime startZdt = startAt.atZone(timeUtils.getClubZoneId());
        int minute = startZdt.getMinute();
        if (minute != 0 && minute != 30) {
            throw new BusinessValidationException(
                    "Court sessions must start on the hour or half-hour (:00 or :30)",
                    "INVALID_SLOT_START_TIME"
            );
        }

        Instant now = timeUtils.now();
        if (startAt.plus(PAST_GRACE_MINUTES, ChronoUnit.MINUTES).isBefore(now)) {
            throw new BusinessValidationException("Cannot book a court slot in the past", "BOOKING_IN_PAST");
        }

        LocalDate clubBookingDate = timeUtils.toClubLocalDate(startAt);

        // 4. Validate Opening Hours
        validateOpeningHours(court, startAt, endAt, clubBookingDate);

        // 5. Validate Blackouts
        List<CourtBlackout> blackouts = blackoutRepository.findOverlappingBlackouts(court.getId(), startAt, endAt);
        if (!blackouts.isEmpty()) {
            throw new BusinessValidationException(
                    "Court slot is blocked: " + blackouts.get(0).getReason(),
                    "SLOT_BLOCKED"
            );
        }

        // 6. Resolve Customer / Member / Guest with Locking
        Member lockedMember = null;
        User bookingUser = null;
        Member phoneMatchedMember = null;

        if (request.getMemberId() != null) {
            lockedMember = memberRepository.findByIdWithLock(request.getMemberId())
                    .orElseThrow(() -> new ResourceNotFoundException("Member", request.getMemberId()));
            bookingUser = lockedMember.getUser();
        } else if (request.getUserId() != null) {
            Optional<Member> memberOpt = memberRepository.findByUserIdAndIsDeletedFalse(request.getUserId());
            if (memberOpt.isPresent()) {
                lockedMember = memberRepository.findByIdWithLock(memberOpt.get().getId()).orElse(memberOpt.get());
                bookingUser = lockedMember.getUser();
            } else {
                bookingUser = userRepository.findById(request.getUserId())
                        .filter(u -> !u.isDeleted())
                        .orElseThrow(() -> new ResourceNotFoundException("User", request.getUserId()));
            }
        } else if (request.getGuestPhone() != null && !request.getGuestPhone().isBlank()) {
            phoneMatchedMember = memberRepository.findByPhoneAndIsDeletedFalse(request.getGuestPhone().trim()).orElse(null);
        }

        // 7. Enforce Member Specific Rules (Status, Expiry, Quota, Overlaps, Junior)
        if (lockedMember != null) {
            enforceMemberRules(lockedMember, startAt, endAt, clubBookingDate, request.getSource(), request.isAllowExpiredMemberWalkInRate());
        }

        // 8. Application-level Double Booking Conflict Check
        List<Booking> conflicts = bookingRepository.findConflictingBookings(
                court.getId(), startAt, endAt, BookingStatus.CANCELLED
        );
        boolean slotTaken = conflicts.stream()
                .anyMatch(b -> b.getStatus() == BookingStatus.HELD || b.getStatus() == BookingStatus.CONFIRMED);
        if (slotTaken) {
            throw new DoubleBookingException(
                    String.format("Court '%s' is already reserved for the selected slot", court.getName())
            );
        }

        // 9. Pricing Resolution & Snapshot
        PricingQuoteResponse quote;
        boolean isWalkInRate = (lockedMember == null) || (lockedMember.getEndDate() != null && clubBookingDate.isAfter(lockedMember.getEndDate()));

        if (isWalkInRate) {
            quote = pricingResolverService.resolveQuote(court, startAt, null, null, null);
        } else {
            quote = pricingResolverService.resolveQuote(
                    court, startAt, lockedMember.getPlan(),
                    bookingUser != null ? bookingUser.getId() : null, bookingUser
            );
        }

        BigDecimal totalPrice = quote.getPrice();
        String planSnapshot = quote.getPlanCode() != null ? quote.getPlanCode() : "WALK_IN";

        // 10. Process Co-players & Extra Fees
        List<BookingParticipant> participantEntities = new ArrayList<>();
        if (request.getParticipants() != null) {
            for (ParticipantDto pDto : request.getParticipants()) {
                BigDecimal fee = BigDecimal.ZERO;
                Member participantMember = null;
                boolean isGuest = pDto.isGuest() || pDto.getMemberId() == null;

                if (isGuest) {
                    fee = pDto.getFee() != null ? pDto.getFee() : DEFAULT_GUEST_FEE;
                    totalPrice = totalPrice.add(fee);
                } else {
                    participantMember = memberRepository.findByIdAndIsDeletedFalse(pDto.getMemberId()).orElse(null);
                }

                participantEntities.add(BookingParticipant.builder()
                        .member(participantMember)
                        .guestName(pDto.getGuestName())
                        .guestPhone(pDto.getGuestPhone())
                        .isGuest(isGuest)
                        .fee(fee)
                        .createdAt(now)
                        .build());
            }
        }

        // 11. Determine Hold vs Direct Confirmation
        BookingStatus status;
        Instant holdExpiresAt = null;
        PaymentStatus paymentStatus;

        if (request.getSource() == BookingSource.ONLINE && request.isHold()) {
            status = BookingStatus.HELD;
            holdExpiresAt = now.plus(HOLD_DURATION_MINUTES, ChronoUnit.MINUTES);
            paymentStatus = PaymentStatus.UNPAID;
        } else {
            status = BookingStatus.CONFIRMED;
            paymentStatus = PaymentStatus.PAID;
        }

        String ref = "BK-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();

        Booking booking = Booking.builder()
                .bookingReference(ref)
                .court(court)
                .member(lockedMember)
                .user(bookingUser)
                .guestName(request.getGuestName())
                .guestPhone(request.getGuestPhone())
                .startAt(startAt)
                .endAt(endAt)
                .status(status)
                .source(request.getSource() != null ? request.getSource() : BookingSource.ONLINE)
                .price(totalPrice)
                .planSnapshot(planSnapshot)
                .paymentStatus(paymentStatus)
                .idempotencyKey(idempotencyKey)
                .holdExpiresAt(holdExpiresAt)
                .createdBy(caller)
                .createdAt(now)
                .updatedAt(now)
                .build();

        for (BookingParticipant participant : participantEntities) {
            participant.setBooking(booking);
        }
        booking.setParticipants(participantEntities);

        // 12. Save Entity with DB Guard GiST Exclusion Constraint Catch
        Booking saved;
        try {
            saved = bookingRepository.saveAndFlush(booking);
        } catch (DataIntegrityViolationException ex) {
            String msg = ex.getMessage();
            if (msg != null && (msg.contains("no_overlapping_court_bookings") || msg.contains("exclusion") || msg.contains("23P01"))) {
                throw new DoubleBookingException("Court slot has just been reserved by another member");
            }
            throw ex;
        }

        // 13. Audit Log & SSE Broadcast
        auditService.record(
                bookingUser != null ? bookingUser.getId() : (caller != null ? caller.getId() : null),
                status == BookingStatus.HELD ? "HOLD_BOOKING" : "CREATE_BOOKING",
                "Booking",
                saved.getId().toString(),
                String.format("Court: %s, Slot: %s to %s, Amount: %s, Plan: %s, Status: %s",
                        court.getName(), startAt, endAt, totalPrice, planSnapshot, status),
                clientIp
        );

        sseHub.broadcastChange(clubBookingDate.toString(), Map.of(
                "eventType", status == BookingStatus.HELD ? "SLOT_HELD" : "SLOT_BOOKED",
                "courtId", court.getId(),
                "startTime", startAt,
                "endTime", endAt,
                "status", status.name()
        ));

        return mapToBookingResponse(saved, phoneMatchedMember);
    }

    private void enforceMemberRules(
            Member member,
            Instant startAt,
            Instant endAt,
            LocalDate clubBookingDate,
            BookingSource source,
            boolean allowExpiredMemberWalkInRate
    ) {
        // Status Check
        if (member.getStatus() == MemberStatus.SUSPENDED) {
            throw new BusinessValidationException("Member account is suspended. Court bookings are restricted.", "MEMBER_SUSPENDED");
        }
        if (member.getStatus() != MemberStatus.ACTIVE) {
            throw new BusinessValidationException("Member is not active (Status: " + member.getStatus() + ")", "MEMBER_NOT_ACTIVE");
        }

        // Membership End Date Rule
        if (member.getEndDate() != null && clubBookingDate.isAfter(member.getEndDate())) {
            if (source == BookingSource.ONLINE || !allowExpiredMemberWalkInRate) {
                throw new BusinessValidationException(
                        String.format("Membership expires on %s. Please renew your membership to book on %s.",
                                member.getEndDate(), clubBookingDate),
                        "MEMBERSHIP_EXPIRED_ON_DATE"
                );
            }
        }

        // Advance Booking Days Limit
        int advanceDays = member.getPlan() != null ? member.getPlan().getAdvanceBookingDays() : 7;
        LocalDate maxDate = timeUtils.currentClubDate().plusDays(advanceDays);
        if (clubBookingDate.isAfter(maxDate)) {
            throw new BusinessValidationException(
                    String.format("Booking date %s exceeds your membership plan advance booking window (%d days)",
                            clubBookingDate, advanceDays),
                    "ADVANCE_BOOKING_LIMIT_EXCEEDED"
            );
        }

        // Daily Quota Check (Max 2 bookings per member per day)
        Instant dayStart = timeUtils.startOfDayInClub(clubBookingDate);
        Instant dayEnd = timeUtils.endOfDayInClub(clubBookingDate);
        long dailyCount = bookingRepository.countBookingsForMemberInDateRange(
                member.getId(),
                member.getUser() != null ? member.getUser().getId() : null,
                dayStart,
                dayEnd,
                List.of(BookingStatus.HELD, BookingStatus.CONFIRMED, BookingStatus.COMPLETED)
        );

        if (dailyCount >= MAX_BOOKINGS_PER_MEMBER_PER_DAY) {
            throw new BusinessValidationException(
                    String.format("Daily booking limit reached. Members are allowed a maximum of %d active bookings per day",
                            MAX_BOOKINGS_PER_MEMBER_PER_DAY),
                    "DAILY_BOOKING_QUOTA_EXCEEDED"
            );
        }

        // No Overlapping Bookings for the SAME member at the same time on different courts
        List<Booking> overlapping = bookingRepository.findOverlappingBookingsForMember(
                member.getId(),
                member.getUser() != null ? member.getUser().getId() : null,
                startAt,
                endAt,
                List.of(BookingStatus.HELD, BookingStatus.CONFIRMED)
        );
        if (!overlapping.isEmpty()) {
            throw new BusinessValidationException(
                    String.format("Member already has a court reserved (%s) during this time slot",
                            overlapping.get(0).getCourt().getName()),
                    "MEMBER_CONCURRENT_BOOKING_CONFLICT"
            );
        }

        // Junior Rules (Under 18 or Junior plan)
        boolean isJunior = member.isMinor(clubBookingDate) || (member.getPlan() != null && "JUNIOR".equalsIgnoreCase(member.getPlan().getCode()));
        if (isJunior) {
            if (member.getGuardian() == null || member.getGuardian().getName() == null || member.getGuardian().getName().isBlank()) {
                throw new BusinessValidationException(
                        "Junior athletes require a parent/guardian on file to book courts.",
                        "GUARDIAN_REQUIRED"
                );
            }
            LocalTime endLocalTime = endAt.atZone(timeUtils.getClubZoneId()).toLocalTime();
            if (endLocalTime.isAfter(LocalTime.of(20, 0))) {
                throw new BusinessValidationException(
                        "Junior member court sessions must conclude before 20:00 (8:00 PM).",
                        "JUNIOR_RESTRICTED_HOURS"
                );
            }
        }
    }

    private void validateOpeningHours(Court court, Instant startAt, Instant endAt, LocalDate clubDate) {
        DayOfWeek dow = clubDate.getDayOfWeek();
        List<OpeningHours> rules = openingHoursRepository.findRulesForDateAndCourts(clubDate, dow, List.of(court.getId()));
        Optional<OpeningHours> hoursOpt = rules.stream()
                .filter(oh -> oh.getCourt() != null && oh.getCourt().getId().equals(court.getId()))
                .findFirst()
                .or(() -> rules.stream().filter(oh -> oh.getCourt() == null).findFirst());

        if (hoursOpt.isPresent()) {
            OpeningHours hours = hoursOpt.get();
            if (hours.isClosed()) {
                throw new BusinessValidationException("Court is closed on " + dow + ": " + hours.getReason(), "COURT_CLOSED");
            }
            LocalTime slotStart = startAt.atZone(timeUtils.getClubZoneId()).toLocalTime();
            LocalTime openTime = hours.getOpenTime();
            LocalTime closeTime = hours.getCloseTime();

            boolean validTime;
            if (closeTime.isAfter(openTime)) {
                validTime = !slotStart.isBefore(openTime) && !slotStart.isAfter(closeTime.minusMinutes(60));
            } else {
                // Crossing midnight (e.g. 06:00 to 00:00 or 18:00 to 02:00)
                validTime = !slotStart.isBefore(openTime) || slotStart.isBefore(closeTime.minusMinutes(60));
            }

            if (!validTime) {
                throw new BusinessValidationException(
                        String.format("Selected time %s is outside facility operating hours (%s - %s)",
                                slotStart, openTime, closeTime),
                        "OUTSIDE_OPENING_HOURS"
                );
            }
        }
    }

    @Transactional
    public BookingResponse confirmBooking(UUID bookingId, String idempotencyKey, String clientIp, User caller) {
        Booking booking = bookingRepository.findById(bookingId)
                .filter(b -> !b.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Booking", bookingId));

        if (booking.getStatus() == BookingStatus.CONFIRMED) {
            return mapToBookingResponse(booking, null);
        }

        if (booking.getStatus() != BookingStatus.HELD) {
            throw new BusinessValidationException("Booking is not in HELD status (Status: " + booking.getStatus() + ")", "INVALID_BOOKING_STATUS");
        }

        Instant now = timeUtils.now();
        if (booking.getHoldExpiresAt() != null && booking.getHoldExpiresAt().isBefore(now)) {
            booking.setStatus(BookingStatus.CANCELLED);
            booking.setCancelReason("HOLD_EXPIRED");
            bookingRepository.save(booking);
            throw new BusinessValidationException("Slot hold has expired. Please select the slot again.", "HOLD_EXPIRED");
        }

        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setPaymentStatus(PaymentStatus.PAID);
        booking.setHoldExpiresAt(null);
        booking.setUpdatedAt(now);
        Booking saved = bookingRepository.save(booking);

        auditService.record(
                booking.getUser() != null ? booking.getUser().getId() : (caller != null ? caller.getId() : null),
                "CONFIRM_BOOKING",
                "Booking",
                saved.getId().toString(),
                "Confirmed booking " + saved.getBookingReference(),
                clientIp
        );

        LocalDate clubBookingDate = timeUtils.toClubLocalDate(saved.getStartAt());
        sseHub.broadcastChange(clubBookingDate.toString(), Map.of(
                "eventType", "SLOT_BOOKED",
                "courtId", saved.getCourt().getId(),
                "startTime", saved.getStartAt(),
                "endTime", saved.getEndAt(),
                "status", "CONFIRMED"
        ));

        return mapToBookingResponse(saved, null);
    }

    @Transactional
    public BookingResponse cancelBooking(UUID bookingId, CancelBookingRequest request, String idempotencyKey, String clientIp, User caller) {
        Booking booking = bookingRepository.findById(bookingId)
                .filter(b -> !b.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Booking", bookingId));

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            return mapToBookingResponse(booking, null);
        }

        Instant now = timeUtils.now();
        if (booking.getStartAt().isBefore(now)) {
            throw new BusinessValidationException("Cannot cancel a court booking that has already started", "BOOKING_ALREADY_STARTED");
        }

        // Authorization check: Must be owner or staff
        boolean isStaff = caller != null && (caller.getRole() == Role.OWNER || caller.getRole() == Role.MANAGER || caller.getRole() == Role.FRONT_DESK);
        if (caller != null && !isStaff) {
            boolean isOwner = (booking.getUser() != null && booking.getUser().getId().equals(caller.getId()))
                    || (booking.getMember() != null && booking.getMember().getUser() != null && booking.getMember().getUser().getId().equals(caller.getId()));
            if (!isOwner) {
                throw new AccessDeniedException("You do not have permission to cancel this booking.");
            }
        }

        Duration timeUntilStart = Duration.between(now, booking.getStartAt());
        boolean isAfterCutoff = timeUntilStart.toHours() < CANCELLATION_CUTOFF_HOURS;

        if (isAfterCutoff && !isStaff && (request == null || !request.isStaffOverride())) {
            log.info("Member cancelled booking {} after {}h cutoff: non-refundable", booking.getBookingReference(), CANCELLATION_CUTOFF_HOURS);
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancelledAt(now);
        booking.setCancelReason(request != null && request.getReason() != null ? request.getReason() : (isStaff ? "STAFF_CANCELLED" : "MEMBER_CANCELLED"));
        booking.setUpdatedAt(now);
        Booking saved = bookingRepository.save(booking);

        auditService.record(
                caller != null ? caller.getId() : (booking.getUser() != null ? booking.getUser().getId() : null),
                "CANCEL_BOOKING",
                "Booking",
                saved.getId().toString(),
                "Cancelled booking " + saved.getBookingReference() + ": " + saved.getCancelReason(),
                clientIp
        );

        LocalDate clubBookingDate = timeUtils.toClubLocalDate(saved.getStartAt());

        // Process Waitlist Promotion
        promoteNextWaitlistEntry(saved.getCourt(), saved.getStartAt(), saved.getEndAt());

        sseHub.broadcastChange(clubBookingDate.toString(), Map.of(
                "eventType", "SLOT_RELEASED",
                "courtId", saved.getCourt().getId(),
                "startTime", saved.getStartAt(),
                "endTime", saved.getEndAt()
        ));

        return mapToBookingResponse(saved, null);
    }

    private void promoteNextWaitlistEntry(Court court, Instant startAt, Instant endAt) {
        List<BookingWaitlist> waiters = waitlistRepository.findActiveWaitlistForSlot(court.getId(), startAt, WaitlistStatus.WAITING);
        if (!waiters.isEmpty()) {
            BookingWaitlist first = waiters.get(0);
            Instant now = timeUtils.now();
            Instant holdExpiresAt = now.plus(WAITLIST_HOLD_MINUTES, ChronoUnit.MINUTES);

            // Create 10-minute hold reservation for waitlisted member
            String ref = "WL-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
            Booking heldBooking = Booking.builder()
                    .bookingReference(ref)
                    .court(court)
                    .member(first.getMember())
                    .user(first.getMember().getUser())
                    .startAt(startAt)
                    .endAt(endAt)
                    .status(BookingStatus.HELD)
                    .source(BookingSource.ONLINE)
                    .price(court.getHourlyRateMember())
                    .planSnapshot(first.getMember().getPlan() != null ? first.getMember().getPlan().getCode() : "MEMBER")
                    .paymentStatus(PaymentStatus.UNPAID)
                    .holdExpiresAt(holdExpiresAt)
                    .createdAt(now)
                    .updatedAt(now)
                    .build();

            Booking savedHeld = bookingRepository.save(heldBooking);

            first.setStatus(WaitlistStatus.OFFERED);
            first.setHoldExpiresAt(holdExpiresAt);
            first.setHeldBookingId(savedHeld.getId());
            first.setNotifiedAt(now);
            waitlistRepository.save(first);

            // Notify waitlisted member
            try {
                notificationDispatcher.dispatch(
                        first.getMember().getUser(),
                        first.getMember(),
                        "Court Slot Available!",
                        String.format("Good news! A slot on %s for %s has opened up and is reserved for you for 10 minutes. Claim it now!",
                                court.getName(), timeUtils.toClubLocalDate(startAt)),
                        NotificationType.BOOKING,
                        "{\"courtId\":\"" + court.getId() + "\",\"bookingId\":\"" + savedHeld.getId() + "\"}"
                );
            } catch (Exception e) {
                log.warn("Failed to dispatch waitlist notification: {}", e.getMessage());
            }
        }
    }

    @Transactional
    public BookingResponse rescheduleBooking(UUID bookingId, RescheduleRequest request, String idempotencyKey, String clientIp, User caller) {
        Booking oldBooking = bookingRepository.findById(bookingId)
                .filter(b -> !b.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Booking", bookingId));

        if (oldBooking.getStatus() != BookingStatus.CONFIRMED) {
            throw new BusinessValidationException("Only CONFIRMED bookings can be rescheduled", "CANNOT_RESCHEDULE");
        }

        Instant now = timeUtils.now();
        if (oldBooking.getStartAt().isBefore(now)) {
            throw new BusinessValidationException("Cannot reschedule a booking that has already started", "BOOKING_ALREADY_STARTED");
        }

        // Create new booking for target slot in atomic transaction
        CreateBookingRequest createRequest = CreateBookingRequest.builder()
                .courtId(request.getNewCourtId())
                .memberId(oldBooking.getMember() != null ? oldBooking.getMember().getId() : null)
                .userId(oldBooking.getUser() != null ? oldBooking.getUser().getId() : null)
                .guestName(oldBooking.getGuestName())
                .guestPhone(oldBooking.getGuestPhone())
                .startTime(request.getNewStartTime())
                .endTime(request.getNewEndTime())
                .source(oldBooking.getSource())
                .isHold(false)
                .build();

        // 1. Create and persist new booking
        BookingResponse newResponse = createBookingInternal(createRequest, idempotencyKey, clientIp, caller);

        // 2. Mark old booking as CANCELLED with reschedule pointer
        oldBooking.setStatus(BookingStatus.CANCELLED);
        oldBooking.setCancelledAt(now);
        oldBooking.setCancelReason("RESCHEDULED_TO_" + newResponse.getBookingReference() + (request.getReason() != null ? " (" + request.getReason() + ")" : ""));
        oldBooking.setUpdatedAt(now);
        bookingRepository.save(oldBooking);

        // Notify waitlist on old slot
        promoteNextWaitlistEntry(oldBooking.getCourt(), oldBooking.getStartAt(), oldBooking.getEndAt());

        return newResponse;
    }

    @Transactional
    public WaitlistResponse joinWaitlist(JoinWaitlistRequest request, User caller) {
        Court court = courtRepository.findById(request.getCourtId())
                .filter(c -> !c.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Court", request.getCourtId()));

        Member member;
        if (request.getMemberId() != null) {
            member = memberRepository.findByIdAndIsDeletedFalse(request.getMemberId())
                    .orElseThrow(() -> new ResourceNotFoundException("Member", request.getMemberId()));
        } else if (caller != null) {
            member = memberRepository.findByUserIdAndIsDeletedFalse(caller.getId())
                    .orElseThrow(() -> new BusinessValidationException("Waitlist is exclusive to registered members", "MEMBER_REQUIRED"));
        } else {
            throw new BusinessValidationException("Member ID is required to join the waitlist", "MEMBER_REQUIRED");
        }

        if (member.getStatus() != MemberStatus.ACTIVE) {
            throw new BusinessValidationException("Member account is not active", "MEMBER_NOT_ACTIVE");
        }

        Instant startAt = request.getStartTime();
        Instant endAt = request.getEndTime() != null ? request.getEndTime() : startAt.plus(SESSION_DURATION_MINUTES, ChronoUnit.MINUTES);

        BookingWaitlist entry = BookingWaitlist.builder()
                .court(court)
                .startAt(startAt)
                .endAt(endAt)
                .member(member)
                .status(WaitlistStatus.WAITING)
                .createdAt(timeUtils.now())
                .build();

        BookingWaitlist saved = waitlistRepository.save(entry);
        return mapToWaitlistResponse(saved);
    }

    @Transactional
    public void leaveWaitlist(UUID waitlistId, User caller) {
        BookingWaitlist waitlist = waitlistRepository.findById(waitlistId)
                .orElseThrow(() -> new ResourceNotFoundException("WaitlistEntry", waitlistId));
        waitlist.setStatus(WaitlistStatus.CANCELLED);
        waitlistRepository.save(waitlist);
    }

    @Transactional(readOnly = true)
    public List<WaitlistResponse> getWaitlistForMember(UUID memberId) {
        return waitlistRepository.findByMemberIdOrderByCreatedAtDesc(memberId).stream()
                .map(this::mapToWaitlistResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public BookingResponse getBookingById(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .filter(b -> !b.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Booking", bookingId));
        return mapToBookingResponse(booking, null);
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getUserBookings(UUID userId) {
        Optional<Member> memberOpt = memberRepository.findByUserIdAndIsDeletedFalse(userId);
        UUID memberId = memberOpt.map(Member::getId).orElse(null);
        return bookingRepository.findByMemberOrUserOrderByStartAtDesc(memberId, userId).stream()
                .map(b -> mapToBookingResponse(b, null))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getMemberBookings(UUID memberId) {
        Member member = memberRepository.findByIdAndIsDeletedFalse(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Member", memberId));
        UUID userId = member.getUser() != null ? member.getUser().getId() : null;
        return bookingRepository.findByMemberOrUserOrderByStartAtDesc(memberId, userId).stream()
                .map(b -> mapToBookingResponse(b, null))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> listBookings(UUID courtId, BookingStatus status, Instant fromTime, Instant toTime) {
        return bookingRepository.findBookingsWithFilters(courtId, status, fromTime, toTime).stream()
                .map(b -> mapToBookingResponse(b, null))
                .toList();
    }

    @Transactional
    public BookingResponse markNoShow(UUID bookingId, String reason, String clientIp, User caller) {
        Booking booking = bookingRepository.findById(bookingId)
                .filter(b -> !b.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Booking", bookingId));

        booking.setStatus(BookingStatus.NO_SHOW);
        booking.setCancelReason(reason != null ? reason : "MEMBER_NO_SHOW");
        booking.setUpdatedAt(timeUtils.now());
        Booking saved = bookingRepository.save(booking);

        auditService.record(
                caller != null ? caller.getId() : null,
                "MARK_NO_SHOW",
                "Booking",
                saved.getId().toString(),
                "Marked booking " + saved.getBookingReference() + " as NO_SHOW",
                clientIp
        );

        return mapToBookingResponse(saved, null);
    }

    @Transactional
    public int releaseExpiredHolds() {
        Instant now = timeUtils.now();
        List<Booking> expiredHolds = bookingRepository.findExpiredHolds(now);
        int count = 0;
        for (Booking booking : expiredHolds) {
            booking.setStatus(BookingStatus.CANCELLED);
            booking.setCancelledAt(now);
            booking.setCancelReason("HOLD_EXPIRED");
            bookingRepository.save(booking);
            promoteNextWaitlistEntry(booking.getCourt(), booking.getStartAt(), booking.getEndAt());
            count++;
        }
        return count;
    }

    @Transactional
    public int autoCompleteBookings() {
        Instant now = timeUtils.now();
        List<Booking> completed = bookingRepository.findCompletedBookingsToArchive(now);
        for (Booking booking : completed) {
            booking.setStatus(BookingStatus.COMPLETED);
            booking.setUpdatedAt(now);
            bookingRepository.save(booking);
        }
        return completed.size();
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

    public BookingResponse mapToBookingResponse(Booking booking, Member phoneMatchedMember) {
        List<ParticipantDto> pDtos = booking.getParticipants() != null
                ? booking.getParticipants().stream().map(p -> ParticipantDto.builder()
                        .id(p.getId())
                        .memberId(p.getMember() != null ? p.getMember().getId() : null)
                        .memberName(p.getMember() != null ? p.getMember().getFullName() : null)
                        .memberNo(p.getMember() != null ? p.getMember().getMemberNo() : null)
                        .guestName(p.getGuestName())
                        .guestPhone(p.getGuestPhone())
                        .isGuest(p.isGuest())
                        .fee(p.getFee())
                        .build()).toList()
                : List.of();

        return BookingResponse.builder()
                .id(booking.getId())
                .bookingReference(booking.getBookingReference())
                .courtId(booking.getCourt().getId())
                .courtName(booking.getCourt().getName())
                .sportType(booking.getCourt().getSportType())
                .userId(booking.getUser() != null ? booking.getUser().getId() : null)
                .userName(booking.getUser() != null ? booking.getUser().getFullName() : null)
                .memberId(booking.getMember() != null ? booking.getMember().getId() : null)
                .memberNo(booking.getMember() != null ? booking.getMember().getMemberNo() : null)
                .memberName(booking.getMember() != null ? booking.getMember().getFullName() : null)
                .guestName(booking.getGuestName())
                .guestPhone(booking.getGuestPhone())
                .startTime(booking.getStartAt())
                .endTime(booking.getEndAt())
                .status(booking.getStatus())
                .source(booking.getSource())
                .price(booking.getPrice())
                .totalAmount(booking.getPrice())
                .planSnapshot(booking.getPlanSnapshot())
                .tierApplied(booking.getPlanSnapshot())
                .paymentStatus(booking.getPaymentStatus())
                .idempotencyKey(booking.getIdempotencyKey())
                .holdExpiresAt(booking.getHoldExpiresAt())
                .cancelledAt(booking.getCancelledAt())
                .cancelReason(booking.getCancelReason())
                .participants(pDtos)
                .suggestedMemberId(phoneMatchedMember != null ? phoneMatchedMember.getId() : null)
                .suggestedMemberName(phoneMatchedMember != null ? phoneMatchedMember.getFullName() : null)
                .suggestedMemberNo(phoneMatchedMember != null ? phoneMatchedMember.getMemberNo() : null)
                .createdAt(booking.getCreatedAt())
                .updatedAt(booking.getUpdatedAt())
                .build();
    }

    public WaitlistResponse mapToWaitlistResponse(BookingWaitlist w) {
        return WaitlistResponse.builder()
                .id(w.getId())
                .courtId(w.getCourt().getId())
                .courtName(w.getCourt().getName())
                .startTime(w.getStartAt())
                .endTime(w.getEndAt())
                .memberId(w.getMember().getId())
                .memberName(w.getMember().getFullName())
                .memberNo(w.getMember().getMemberNo())
                .status(w.getStatus())
                .holdExpiresAt(w.getHoldExpiresAt())
                .heldBookingId(w.getHeldBookingId())
                .createdAt(w.getCreatedAt())
                .notifiedAt(w.getNotifiedAt())
                .build();
    }
}
