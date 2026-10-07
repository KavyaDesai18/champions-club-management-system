package com.championsclub.social.service;

import com.championsclub.member.domain.User;
import com.championsclub.member.repo.UserRepository;
import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.DoubleBookingException;
import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.common.time.ClubTimeUtils;
import com.championsclub.court.domain.*;
import com.championsclub.court.repo.BookingRepository;
import com.championsclub.court.repo.CourtBlackoutRepository;
import com.championsclub.court.repo.CourtRepository;
import com.championsclub.court.repo.SportRepository;
import com.championsclub.member.domain.Member;
import com.championsclub.member.domain.MemberStatus;
import com.championsclub.member.repo.MemberRepository;
import com.championsclub.notification.domain.NotificationType;
import com.championsclub.notification.service.NotificationDispatcher;
import com.championsclub.social.domain.*;
import com.championsclub.social.dto.*;
import com.championsclub.social.repo.SocialParticipantRepository;
import com.championsclub.social.repo.SocialSessionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SocialPlayService {

    private static final Logger log = LoggerFactory.getLogger(SocialPlayService.class);
    private static final int CANCELLATION_REFUND_CUTOFF_HOURS = 2;

    private final SocialSessionRepository sessionRepository;
    private final SocialParticipantRepository participantRepository;
    private final CourtRepository courtRepository;
    private final SportRepository sportRepository;
    private final BookingRepository bookingRepository;
    private final CourtBlackoutRepository blackoutRepository;
    private final MemberRepository memberRepository;
    private final UserRepository userRepository;
    private final NotificationDispatcher notificationDispatcher;
    private final ClubTimeUtils timeUtils;
    private final Clock clock;

    public SocialPlayService(
            SocialSessionRepository sessionRepository,
            SocialParticipantRepository participantRepository,
            CourtRepository courtRepository,
            SportRepository sportRepository,
            BookingRepository bookingRepository,
            CourtBlackoutRepository blackoutRepository,
            MemberRepository memberRepository,
            UserRepository userRepository,
            NotificationDispatcher notificationDispatcher,
            ClubTimeUtils timeUtils,
            Clock clock
    ) {
        this.sessionRepository = sessionRepository;
        this.participantRepository = participantRepository;
        this.courtRepository = courtRepository;
        this.sportRepository = sportRepository;
        this.bookingRepository = bookingRepository;
        this.blackoutRepository = blackoutRepository;
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
        this.notificationDispatcher = notificationDispatcher;
        this.timeUtils = timeUtils;
        this.clock = clock;
    }

    /**
     * Creates a social session and blocks the court using the GiST exclusion constraint on bookings.
     * Supports recurring series generation across repeatWeeks.
     */
    @Transactional
    public List<SocialSessionResponse> createSession(CreateSocialSessionRequest request, UUID creatorUserId) {
        Court court = courtRepository.findById(request.getCourtId())
                .orElseThrow(() -> new ResourceNotFoundException("Court", request.getCourtId()));

        if (!court.isActive() || court.getStatus() != CourtStatus.ACTIVE) {
            throw new BusinessValidationException("Cannot create session on inactive or maintenance court", "COURT_INACTIVE");
        }

        Sport sport = sportRepository.findById(request.getSportId())
                .orElseThrow(() -> new ResourceNotFoundException("Sport", request.getSportId()));

        User creator = creatorUserId != null ? userRepository.findById(creatorUserId).orElse(null) : null;

        int repeatWeeks = request.getRepeatWeeks() != null && request.getRepeatWeeks() > 0 ? request.getRepeatWeeks() : 1;
        List<SocialSession> createdSessions = new ArrayList<>();
        UUID parentSeriesId = null;

        for (int week = 0; week < repeatWeeks; week++) {
            Instant occurrenceStart = request.getStartAt().plus(week * 7L, ChronoUnit.DAYS);
            Instant occurrenceEnd = request.getEndAt().plus(week * 7L, ChronoUnit.DAYS);

            // 1. Check blackout overlap
            boolean isBlackout = blackoutRepository.existsOverlapping(court.getId(), occurrenceStart, occurrenceEnd);
            if (isBlackout) {
                if (week == 0) {
                    throw new BusinessValidationException("Court is scheduled for maintenance/blackout during requested window", "COURT_BLACKED_OUT");
                } else {
                    log.warn("Skipping recurring occurrence for week {} due to court blackout", week);
                    continue;
                }
            }

            // 2. Check existing social session overlap
            if (sessionRepository.existsOverlapping(court.getId(), occurrenceStart, occurrenceEnd)) {
                if (week == 0) {
                    throw new DoubleBookingException("A social play session is already scheduled on this court at that time");
                } else {
                    continue; // idempotent skip
                }
            }

            // 3. Create Booking row of source SOCIAL_BLOCK to trigger DB GiST exclusion constraint
            Booking blockBooking = Booking.builder()
                    .court(court)
                    .startAt(occurrenceStart)
                    .endAt(occurrenceEnd)
                    .status(BookingStatus.CONFIRMED)
                    .source(BookingSource.SOCIAL_BLOCK)
                    .planSnapshot(request.getTitle())
                    .price(BigDecimal.ZERO)
                    .paymentStatus(PaymentStatus.PAID)
                    .idempotencyKey("SOCIAL_BLOCK_" + UUID.randomUUID())
                    .build();

            try {
                blockBooking = bookingRepository.saveAndFlush(blockBooking);
            } catch (DataIntegrityViolationException ex) {
                throw new DoubleBookingException("Court is already booked for a regular session or hold during that time");
            }

            // 4. Create SocialSession
            SocialSession session = SocialSession.builder()
                    .court(court)
                    .sport(sport)
                    .booking(blockBooking)
                    .parentSeriesId(parentSeriesId)
                    .title(request.getTitle())
                    .description(request.getDescription())
                    .startAt(occurrenceStart)
                    .endAt(occurrenceEnd)
                    .capacity(request.getCapacity())
                    .minParticipants(request.getMinParticipants() != null ? request.getMinParticipants() : 4)
                    .feeMember(request.getFeeMember() != null ? request.getFeeMember() : BigDecimal.ZERO)
                    .feeGuest(request.getFeeGuest() != null ? request.getFeeGuest() : new BigDecimal("15.00"))
                    .recurrenceRule(request.getRecurrenceRule())
                    .status(SocialSessionStatus.SCHEDULED)
                    .allowJuniors(request.getAllowJuniors() != null ? request.getAllowJuniors() : true)
                    .countsTowardDailyQuota(request.getCountsTowardDailyQuota() != null ? request.getCountsTowardDailyQuota() : false)
                    .createdBy(creator)
                    .build();

            session = sessionRepository.save(session);

            if (week == 0 && repeatWeeks > 1) {
                parentSeriesId = session.getId();
                session.setParentSeriesId(parentSeriesId);
                session = sessionRepository.save(session);
            }

            createdSessions.add(session);
        }

        return createdSessions.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    /**
     * Edits a single occurrence or the whole future series.
     */
    @Transactional
    public SocialSessionResponse updateSession(UUID sessionId, UpdateSocialSessionRequest request) {
        SocialSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("SocialSession", sessionId));

        if (!session.isScheduled()) {
            throw new BusinessValidationException("Cannot update cancelled or completed session", "INVALID_STATUS");
        }

        if (Boolean.TRUE.equals(request.getUpdateWholeSeries()) && session.getParentSeriesId() != null) {
            // Update all future scheduled sessions in series
            List<SocialSession> seriesSessions = sessionRepository.findByParentSeriesIdAndStartAtAfterAndStatusOrderByStartAtAsc(
                    session.getParentSeriesId(), session.getStartAt().minusSeconds(1), SocialSessionStatus.SCHEDULED
            );
            for (SocialSession s : seriesSessions) {
                applySessionUpdates(s, request);
                sessionRepository.save(s);
            }
        } else {
            applySessionUpdates(session, request);
            session = sessionRepository.save(session);
        }

        return mapToResponse(session);
    }

    private void applySessionUpdates(SocialSession session, UpdateSocialSessionRequest request) {
        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            session.setTitle(request.getTitle());
            if (session.getBooking() != null) {
                session.getBooking().setPlanSnapshot(request.getTitle());
            }
        }
        if (request.getDescription() != null) {
            session.setDescription(request.getDescription());
        }
        if (request.getCapacity() != null && request.getCapacity() > 0) {
            session.setCapacity(request.getCapacity());
        }
        if (request.getMinParticipants() != null) {
            session.setMinParticipants(request.getMinParticipants());
        }
        if (request.getFeeMember() != null) {
            session.setFeeMember(request.getFeeMember());
        }
        if (request.getFeeGuest() != null) {
            session.setFeeGuest(request.getFeeGuest());
        }
        if (request.getAllowJuniors() != null) {
            session.setAllowJuniors(request.getAllowJuniors());
        }
        if (request.getCountsTowardDailyQuota() != null) {
            session.setCountsTowardDailyQuota(request.getCountsTowardDailyQuota());
        }
    }

    /**
     * Cancels a single session or entire future series, releasing court blocks and notifying participants.
     */
    @Transactional
    public void cancelSession(UUID sessionId, boolean cancelWholeSeries, String reason) {
        SocialSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("SocialSession", sessionId));

        List<SocialSession> targets = new ArrayList<>();
        if (cancelWholeSeries && session.getParentSeriesId() != null) {
            targets = sessionRepository.findByParentSeriesIdAndStartAtAfterAndStatusOrderByStartAtAsc(
                    session.getParentSeriesId(), clock.instant(), SocialSessionStatus.SCHEDULED
            );
            if (!targets.contains(session)) {
                targets.add(session);
            }
        } else {
            targets.add(session);
        }

        for (SocialSession s : targets) {
            s.setStatus(SocialSessionStatus.CANCELLED);
            if (s.getBooking() != null) {
                s.getBooking().setStatus(BookingStatus.CANCELLED);
                s.getBooking().setCancelledAt(clock.instant());
                s.getBooking().setCancelReason(reason != null ? reason : "Social session cancelled by staff");
                bookingRepository.save(s.getBooking());
            }

            // Cancel and refund participants
            List<SocialParticipant> participants = participantRepository.findBySessionIdOrderByJoinedAtAsc(s.getId());
            for (SocialParticipant p : participants) {
                if (p.getStatus() != SocialParticipantStatus.CANCELLED) {
                    p.setStatus(SocialParticipantStatus.CANCELLED);
                    p.setPaymentStatus(SocialPaymentStatus.REFUNDED);
                    participantRepository.save(p);

                    // Notify member
                    if (p.getMember() != null && p.getMember().getUser() != null) {
                        try {
                            notificationDispatcher.dispatch(
                                    p.getMember().getUser(),
                                    p.getMember(),
                                    "Social Session Cancelled",
                                    String.format("The session '%s' on %s has been cancelled. Any fees paid have been refunded.",
                                            s.getTitle(), s.getStartAt()),
                                    NotificationType.BOOKING,
                                    "{}"
                            );
                        } catch (Exception ex) {
                            log.warn("Failed to dispatch cancel notification to member {}: {}", p.getMember().getId(), ex.getMessage());
                        }
                    }
                }
            }
            sessionRepository.save(s);
        }
    }

    /**
     * Atomically joins a social session. Enforces capacity with pessimistic row lock.
     * When capacity is reached, participant is assigned WAITLISTED status.
     */
    @Transactional
    public SocialParticipantResponse joinSession(UUID sessionId, JoinSocialSessionRequest request, UUID requestingUserId) {
        SocialSession session = sessionRepository.findByIdWithLock(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("SocialSession", sessionId));

        if (!session.isScheduled()) {
            throw new BusinessValidationException("Cannot join cancelled or completed session", "SESSION_NOT_ACTIVE");
        }

        Instant now = clock.instant();
        if (session.getStartAt().isBefore(now)) {
            throw new BusinessValidationException("Cannot join session that has already started", "SESSION_ALREADY_STARTED");
        }

        Member member = null;
        BigDecimal feePaid = BigDecimal.ZERO;
        String guestName = request.getGuestName();
        String guestPhone = request.getGuestPhone();

        // 1. Resolve Member or Guest
        if (request.getMemberId() != null || requestingUserId != null) {
            UUID memberLookupId = request.getMemberId();
            if (memberLookupId == null && requestingUserId != null) {
                User user = userRepository.findById(requestingUserId).orElse(null);
                if (user != null) {
                    member = memberRepository.findByUserIdAndIsDeletedFalse(user.getId()).orElse(null);
                }
            } else if (memberLookupId != null) {
                member = memberRepository.findByIdAndIsDeletedFalse(memberLookupId).orElse(null);
            }
        }

        if (member != null) {
            // Member validations
            if (member.getStatus() != MemberStatus.ACTIVE) {
                throw new BusinessValidationException("Only ACTIVE members can join social play sessions", "MEMBER_INACTIVE");
            }

            // Check duplicate join
            if (participantRepository.findActiveBySessionAndMember(sessionId, member.getId()).isPresent()) {
                throw new BusinessValidationException("Member is already joined or waitlisted for this session", "ALREADY_REGISTERED");
            }

            // Check Junior rules
            LocalDate clubDate = timeUtils.toClubLocalDate(session.getStartAt());
            if (member.isMinor(clubDate)) {
                if (!Boolean.TRUE.equals(session.getAllowJuniors())) {
                    throw new BusinessValidationException("Juniors are not permitted to join this social session", "JUNIOR_RESTRICTED");
                }
                if (member.getGuardian() == null) {
                    throw new BusinessValidationException("Junior members require a guardian on file to join sessions", "GUARDIAN_REQUIRED");
                }
                // Curfew: cannot conclude after 20:00 without guardian
                LocalTime endTimeLocal = session.getEndAt().atZone(timeUtils.getClubZoneId()).toLocalTime();
                if (endTimeLocal.isAfter(LocalTime.of(20, 0))) {
                    throw new BusinessValidationException("Junior members cannot join sessions ending after 20:00", "JUNIOR_CURFEW");
                }
            }

            // Daily quota check if session counts toward limit
            if (Boolean.TRUE.equals(session.getCountsTowardDailyQuota())) {
                Instant dayStart = timeUtils.startOfDayInClub(clubDate);
                Instant dayEnd = timeUtils.endOfDayInClub(clubDate);
                long activeRegularBookings = bookingRepository.countBookingsForMemberInDateRange(
                        member.getId(), null, dayStart, dayEnd, Set.of(BookingStatus.CONFIRMED, BookingStatus.HELD, BookingStatus.COMPLETED)
                );
                long activeSocialSessions = participantRepository.countMemberDailySocialSessions(member.getId(), dayStart, dayEnd);
                if ((activeRegularBookings + activeSocialSessions) >= 2) {
                    throw new BusinessValidationException("Daily quota of 2 active sessions reached for " + clubDate, "DAILY_QUOTA_EXCEEDED");
                }
            }

            // Price evaluation: Gold tier gets free social play; Silver/others pay member fee
            if (member.getPlan() != null && "GOLD".equalsIgnoreCase(member.getPlan().getCode())) {
                feePaid = BigDecimal.ZERO;
            } else {
                feePaid = session.getFeeMember();
            }
        } else {
            // Guest validations
            if (guestName == null || guestName.isBlank()) {
                throw new BusinessValidationException("Guest name is required for non-member registrations", "GUEST_NAME_REQUIRED");
            }
            if (guestPhone == null || guestPhone.isBlank()) {
                throw new BusinessValidationException("Guest phone is required for non-member registrations", "GUEST_PHONE_REQUIRED");
            }

            if (participantRepository.findActiveBySessionAndGuestPhone(sessionId, guestPhone.trim()).isPresent()) {
                throw new BusinessValidationException("Guest with this phone number is already registered for this session", "ALREADY_REGISTERED");
            }

            feePaid = session.getFeeGuest();
        }

        // 2. Atomic Capacity Check
        long joinedCount = participantRepository.countBySessionIdAndStatus(sessionId, SocialParticipantStatus.JOINED);
        SocialParticipantStatus targetStatus;
        SocialPaymentStatus targetPaymentStatus;

        if (joinedCount < session.getCapacity()) {
            targetStatus = SocialParticipantStatus.JOINED;
            targetPaymentStatus = feePaid.compareTo(BigDecimal.ZERO) == 0 ? SocialPaymentStatus.WAIVED : SocialPaymentStatus.PAID;
        } else {
            targetStatus = SocialParticipantStatus.WAITLISTED;
            targetPaymentStatus = SocialPaymentStatus.PENDING;
        }

        SocialParticipant participant = SocialParticipant.builder()
                .session(session)
                .member(member)
                .guestName(member == null ? guestName.trim() : null)
                .guestPhone(member == null ? guestPhone.trim() : null)
                .status(targetStatus)
                .paymentStatus(targetPaymentStatus)
                .feePaid(feePaid)
                .joinedAt(now)
                .attendanceStatus(AttendanceStatus.PENDING)
                .build();

        participant = participantRepository.save(participant);
        return mapToParticipantResponse(participant);
    }

    /**
     * Leaves a social session.
     * Enforces cancellation refund cutoff (2 hours).
     * If joined participant leaves, automatically promotes the earliest waitlisted participant!
     */
    @Transactional
    public void leaveSession(UUID sessionId, UUID participantId, UUID requestingUserId) {
        SocialSession session = sessionRepository.findByIdWithLock(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("SocialSession", sessionId));

        Instant now = clock.instant();
        if (session.getStartAt().isBefore(now)) {
            throw new BusinessValidationException("Cannot leave session after it has already started", "SESSION_STARTED");
        }

        SocialParticipant participant = participantRepository.findById(participantId)
                .orElseThrow(() -> new ResourceNotFoundException("SocialParticipant", participantId));

        if (!participant.getSession().getId().equals(sessionId)) {
            throw new BusinessValidationException("Participant does not belong to this session", "INVALID_PARTICIPANT");
        }

        if (participant.getStatus() == SocialParticipantStatus.CANCELLED) {
            throw new BusinessValidationException("Participant has already left this session", "ALREADY_CANCELLED");
        }

        boolean wasJoined = participant.getStatus() == SocialParticipantStatus.JOINED;

        // Refund policy evaluation: full refund if >= 2 hours before start
        long hoursUntilStart = ChronoUnit.HOURS.between(now, session.getStartAt());
        if (hoursUntilStart >= CANCELLATION_REFUND_CUTOFF_HOURS) {
            participant.setPaymentStatus(SocialPaymentStatus.REFUNDED);
        }

        participant.setStatus(SocialParticipantStatus.CANCELLED);
        participantRepository.save(participant);

        // Auto-promote earliest waitlisted participant (FIFO)
        if (wasJoined) {
            Optional<SocialParticipant> nextWaitlisted = participantRepository
                    .findFirstBySessionIdAndStatusOrderByJoinedAtAsc(sessionId, SocialParticipantStatus.WAITLISTED);

            if (nextWaitlisted.isPresent()) {
                SocialParticipant promoted = nextWaitlisted.get();
                promoted.setStatus(SocialParticipantStatus.JOINED);
                promoted.setPaymentStatus(promoted.getFeePaid().compareTo(BigDecimal.ZERO) == 0 ? SocialPaymentStatus.WAIVED : SocialPaymentStatus.PAID);
                participantRepository.save(promoted);

                // Notify promoted participant
                if (promoted.getMember() != null && promoted.getMember().getUser() != null) {
                    try {
                        notificationDispatcher.dispatch(
                                promoted.getMember().getUser(),
                                promoted.getMember(),
                                "Promoted from Waitlist! Spot Confirmed",
                                String.format("A spot opened up in '%s' on %s! You are now confirmed.",
                                        session.getTitle(), session.getStartAt()),
                                NotificationType.BOOKING,
                                "{}"
                        );
                    } catch (Exception ex) {
                        log.warn("Failed to dispatch waitlist promotion notification: {}", ex.getMessage());
                    }
                }
            }
        }
    }

    /**
     * Marks player attendance (ATTENDED / ABSENT).
     */
    @Transactional
    public SocialParticipantResponse markAttendance(UUID sessionId, AttendanceUpdateRequest request) {
        SocialParticipant participant = participantRepository.findById(request.getParticipantId())
                .orElseThrow(() -> new ResourceNotFoundException("SocialParticipant", request.getParticipantId()));

        if (!participant.getSession().getId().equals(sessionId)) {
            throw new BusinessValidationException("Participant does not belong to this session", "INVALID_SESSION");
        }

        participant.setAttendanceStatus(request.getAttendanceStatus());
        participant = participantRepository.save(participant);
        return mapToParticipantResponse(participant);
    }

    @Transactional(readOnly = true)
    public List<SocialSessionResponse> getUpcomingSessions(UUID sportId, UUID courtId, SocialSessionStatus status, Instant start, Instant end) {
        Instant effectiveStart = start != null ? start : clock.instant().minus(1, ChronoUnit.DAYS);
        Instant effectiveEnd = end != null ? end : clock.instant().plus(90, ChronoUnit.DAYS);

        List<SocialSession> sessions = sessionRepository.findFiltered(sportId, courtId, status, effectiveStart, effectiveEnd);
        return sessions.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public SocialSessionResponse getSessionById(UUID id) {
        SocialSession session = sessionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SocialSession", id));
        return mapToResponse(session);
    }

    public SocialSessionResponse mapToResponse(SocialSession session) {
        List<SocialParticipant> participants = participantRepository.findBySessionIdOrderByJoinedAtAsc(session.getId());
        int joinedCount = (int) participants.stream().filter(SocialParticipant::isJoined).count();
        int waitlistCount = (int) participants.stream().filter(SocialParticipant::isWaitlisted).count();
        int spotsRemaining = Math.max(0, session.getCapacity() - joinedCount);

        List<SocialParticipantResponse> participantResponses = participants.stream()
                .filter(p -> p.getStatus() != SocialParticipantStatus.CANCELLED)
                .map(this::mapToParticipantResponse)
                .collect(Collectors.toList());

        return SocialSessionResponse.builder()
                .id(session.getId())
                .courtId(session.getCourt().getId())
                .courtName(session.getCourt().getName())
                .sportId(session.getSport().getId())
                .sportName(session.getSport().getName())
                .bookingId(session.getBooking() != null ? session.getBooking().getId() : null)
                .parentSeriesId(session.getParentSeriesId())
                .title(session.getTitle())
                .description(session.getDescription())
                .startAt(session.getStartAt())
                .endAt(session.getEndAt())
                .capacity(session.getCapacity())
                .joinedCount(joinedCount)
                .waitlistCount(waitlistCount)
                .spotsRemaining(spotsRemaining)
                .isFull(spotsRemaining == 0)
                .minParticipants(session.getMinParticipants())
                .feeMember(session.getFeeMember())
                .feeGuest(session.getFeeGuest())
                .recurrenceRule(session.getRecurrenceRule())
                .status(session.getStatus())
                .allowJuniors(session.getAllowJuniors())
                .countsTowardDailyQuota(session.getCountsTowardDailyQuota())
                .participants(participantResponses)
                .createdAt(session.getCreatedAt())
                .build();
    }

    public SocialParticipantResponse mapToParticipantResponse(SocialParticipant p) {
        String memberName = null;
        String memberEmail = null;
        String planCode = null;
        if (p.getMember() != null) {
            memberName = p.getMember().getFullName();
            memberEmail = p.getMember().getEmail();
            if (p.getMember().getPlan() != null) {
                planCode = p.getMember().getPlan().getCode();
            }
        }

        return SocialParticipantResponse.builder()
                .id(p.getId())
                .sessionId(p.getSession().getId())
                .memberId(p.getMember() != null ? p.getMember().getId() : null)
                .memberName(memberName)
                .memberEmail(memberEmail)
                .planCode(planCode)
                .guestName(p.getGuestName())
                .guestPhone(p.getGuestPhone())
                .status(p.getStatus())
                .paymentStatus(p.getPaymentStatus())
                .feePaid(p.getFeePaid())
                .joinedAt(p.getJoinedAt())
                .attendanceStatus(p.getAttendanceStatus())
                .build();
    }
}
