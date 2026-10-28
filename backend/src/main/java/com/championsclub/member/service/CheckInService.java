package com.championsclub.member.service;

import com.championsclub.common.audit.AuditService;
import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.common.time.ClubTimeUtils;
import com.championsclub.member.domain.CheckInStatus;
import com.championsclub.member.domain.Member;
import com.championsclub.member.domain.MemberCheckIn;
import com.championsclub.member.domain.MemberStatus;
import com.championsclub.member.domain.Membership;
import com.championsclub.member.domain.MembershipStatus;
import com.championsclub.member.domain.Plan;
import com.championsclub.member.dto.CheckInRequest;
import com.championsclub.member.dto.CheckInResponse;
import com.championsclub.member.repo.MemberCheckInRepository;
import com.championsclub.member.repo.MemberRepository;
import com.championsclub.member.repo.MembershipRepository;
import com.championsclub.notification.domain.NotificationType;
import com.championsclub.notification.service.NotificationDispatcher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class CheckInService {

    private static final Logger log = LoggerFactory.getLogger(CheckInService.class);
    private static final Duration DUPLICATE_CHECK_IN_WINDOW = Duration.ofMinutes(5);

    private final MemberRepository memberRepository;
    private final MembershipRepository membershipRepository;
    private final MemberCheckInRepository checkInRepository;
    private final QrCodeService qrCodeService;
    private final NotificationDispatcher notificationDispatcher;
    private final ClubTimeUtils timeUtils;
    private final AuditService auditService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.championsclub.bar.repo.TabRepository tabRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.championsclub.court.repo.BookingRepository bookingRepository;

    public CheckInService(
            MemberRepository memberRepository,
            MembershipRepository membershipRepository,
            MemberCheckInRepository checkInRepository,
            QrCodeService qrCodeService,
            NotificationDispatcher notificationDispatcher,
            ClubTimeUtils timeUtils,
            AuditService auditService
    ) {
        this.memberRepository = memberRepository;
        this.membershipRepository = membershipRepository;
        this.checkInRepository = checkInRepository;
        this.qrCodeService = qrCodeService;
        this.notificationDispatcher = notificationDispatcher;
        this.timeUtils = timeUtils;
        this.auditService = auditService;
    }

    @Transactional
    public CheckInResponse processCheckIn(CheckInRequest request, String actor) {
        Member member = resolveMember(request);
        Instant now = timeUtils.now();
        LocalDate today = timeUtils.currentClubDate();

        // 1. Prevent duplicate check-in within 5 minutes
        Instant duplicateWindowStart = now.minus(DUPLICATE_CHECK_IN_WINDOW);
        Optional<MemberCheckIn> recentCheckIn = checkInRepository.findRecentCheckIn(member.getId(), duplicateWindowStart);
        if (recentCheckIn.isPresent()) {
            MemberCheckIn prior = recentCheckIn.get();
            long secondsAgo = ChronoUnit.SECONDS.between(prior.getCheckedInAt(), now);
            log.warn("Duplicate check-in blocked for member {} (checked in {}s ago at {})",
                    member.getMemberNo(), secondsAgo, prior.getCheckedInAt());
            throw new BusinessValidationException(
                    String.format("Duplicate check-in prevented. Member '%s' already checked in %d seconds ago at %s.",
                            member.getFullName(), secondsAgo, prior.getLocation()),
                    "DUPLICATE_CHECK_IN"
            );
        }

        // 2. Evaluate status banner
        CheckInStatus statusBanner;
        String message;
        Integer daysLeft = null;
        Optional<Membership> activeMembership = membershipRepository.findActiveByMemberId(member.getId());

        if (member.getStatus() == MemberStatus.SUSPENDED) {
            statusBanner = CheckInStatus.SUSPENDED;
            message = "MEMBER SUSPENDED: Club access and facility privileges are revoked.";
        } else {
            boolean isExpired = member.getEndDate() == null
                    || today.isAfter(member.getEndDate())
                    || member.getStatus() == MemberStatus.EXPIRED
                    || (activeMembership.isEmpty());

            if (isExpired) {
                statusBanner = CheckInStatus.EXPIRED;
                message = "MEMBERSHIP EXPIRED: Validity ended on " + member.getEndDate() + ". Please renew at front desk.";
                daysLeft = 0;
            } else {
                long remaining = ChronoUnit.DAYS.between(today, member.getEndDate());
                daysLeft = (int) Math.max(0, remaining);

                if (daysLeft <= 7) {
                    statusBanner = CheckInStatus.EXPIRING_SOON;
                    message = String.format("EXPIRING SOON: %d days left until renewal (%s).", daysLeft, member.getEndDate());
                } else {
                    statusBanner = CheckInStatus.ACTIVE;
                    message = "ACCESS GRANTED: Active member in good standing.";
                }
            }
        }

        // 3. Record visit
        String location = request.getLocation() != null && !request.getLocation().isBlank()
                ? request.getLocation()
                : "FRONT_DESK_MAIN";

        MemberCheckIn checkIn = MemberCheckIn.builder()
                .member(member)
                .membership(activeMembership.orElse(null))
                .statusBanner(statusBanner)
                .daysLeft(daysLeft)
                .checkedInAt(now)
                .checkedInBy(actor)
                .location(location)
                .notes(request.getNotes())
                .build();

        checkIn = checkInRepository.save(checkIn);

        auditService.log(
                "MEMBER_CHECK_IN",
                String.format("Check-in: %s [%s] at %s. Banner: %s",
                        member.getMemberNo(), member.getFullName(), location, statusBanner),
                actor,
                member.getId()
        );

        // Dispatch in-app notification
        notificationDispatcher.dispatch(
                member.getUser(),
                member,
                "Checked In at Champions Club",
                String.format("Welcome %s! You checked in at %s at %s.",
                        member.getFullName(), location, now),
                NotificationType.CHECK_IN,
                "{\"checkInId\":\"" + checkIn.getId() + "\",\"statusBanner\":\"" + statusBanner + "\"}"
        );

        boolean hasUnsettled = false;
        int unsettledCount = 0;
        BigDecimal unsettledAmount = BigDecimal.ZERO;
        if (tabRepository != null && member.getId() != null) {
            try {
                var openTabs = tabRepository.findAllByMemberIdAndStatus(member.getId(), com.championsclub.bar.domain.TabStatus.OPEN);
                hasUnsettled = !openTabs.isEmpty();
                unsettledCount = openTabs.size();
                unsettledAmount = openTabs.stream()
                        .map(com.championsclub.bar.domain.Tab::getTotalAmount)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                if (hasUnsettled) {
                    message = message + " [ALERT: Member has " + unsettledCount + " unsettled Bar Tab(s) totaling ₹" + unsettledAmount + "]";
                }
            } catch (Exception ignored) {}
        }

        List<String> benefits = resolveBenefits(member);
        List<com.championsclub.member.dto.BookedSlotDto> bookedSlots = resolveBookedSlots(member);

        return CheckInResponse.builder()
                .memberId(member.getId())
                .memberNo(member.getMemberNo())
                .fullName(member.getFullName())
                .phone(member.getPhone())
                .email(member.getEmail())
                .photoUrl(member.getPhotoUrl())
                .statusBanner(statusBanner.name())
                .daysLeft(daysLeft)
                .startDate(member.getStartDate())
                .endDate(member.getEndDate())
                .planCode(member.getPlan() != null ? member.getPlan().getCode() : "N/A")
                .planName(member.getPlan() != null ? member.getPlan().getName() : "No Plan")
                .benefits(benefits)
                .bookedSlots(bookedSlots)
                .walletBalance(member.getWalletBalance())
                .guestPassesRemaining(member.getGuestPassesRemaining())
                .checkedInAt(now)
                .message(message)
                .duplicate(false)
                .hasUnsettledTabs(hasUnsettled)
                .unsettledTabsCount(unsettledCount)
                .unsettledTabsAmount(unsettledAmount)
                .build();
    }

    private List<String> resolveBenefits(Member member) {
        List<String> benefits = new java.util.ArrayList<>();
        if (member.getPlan() != null) {
            Plan p = member.getPlan();
            if (p.getBenefits() != null && !p.getBenefits().isEmpty()) {
                p.getBenefits().forEach(b -> benefits.add(b.getBenefitText()));
            }
            if (p.getCourtDiscountPct() != null && p.getCourtDiscountPct().compareTo(BigDecimal.ZERO) > 0) {
                benefits.add(p.getCourtDiscountPct().stripTrailingZeros().toPlainString() + "% Court Discount");
            }
            if (p.getShopDiscountPct() != null && p.getShopDiscountPct().compareTo(BigDecimal.ZERO) > 0) {
                benefits.add(p.getShopDiscountPct().stripTrailingZeros().toPlainString() + "% Pro Shop Discount");
            }
            if (p.getBarDiscountPct() != null && p.getBarDiscountPct().compareTo(BigDecimal.ZERO) > 0) {
                benefits.add(p.getBarDiscountPct().stripTrailingZeros().toPlainString() + "% Bar & Lounge Discount");
            }
            if (Boolean.TRUE.equals(p.getFreeCourts())) {
                benefits.add("Complimentary Court Access");
            }
            if (p.getMaxBookingsPerDay() != null) {
                benefits.add("Up to " + p.getMaxBookingsPerDay() + " Sessions / Day");
            }
            if (p.getAdvanceBookingDays() != null) {
                benefits.add(p.getAdvanceBookingDays() + "-Day Advance Booking Window");
            }
        }
        if (member.getGuestPassesRemaining() != null && member.getGuestPassesRemaining() > 0) {
            benefits.add(member.getGuestPassesRemaining() + " Guest Passes Remaining");
        }
        if (benefits.isEmpty()) {
            benefits.add("Standard Club Access");
            benefits.add("Locker & Shower Privileges");
        }
        return benefits;
    }

    private List<com.championsclub.member.dto.BookedSlotDto> resolveBookedSlots(Member member) {
        List<com.championsclub.member.dto.BookedSlotDto> slots = new java.util.ArrayList<>();
        if (bookingRepository == null || member.getId() == null) {
            return slots;
        }
        try {
            var bookings = bookingRepository.findByMemberOrUserOrderByStartAtDesc(
                    member.getId(),
                    member.getUser() != null ? member.getUser().getId() : null
            );
            Instant now = timeUtils.now();
            Instant cutoff = now.minus(Duration.ofHours(3));
            for (var b : bookings) {
                if (b.getEndAt() != null && b.getEndAt().isAfter(cutoff) && b.getStatus() != com.championsclub.court.domain.BookingStatus.CANCELLED) {
                    String courtName = b.getCourt() != null ? b.getCourt().getName() : "Court Session";
                    String sport = b.getCourt() != null && b.getCourt().getSport() != null ? b.getCourt().getSport().getName() : "COURT";
                    String timeWindow = b.getStartAt() + " - " + b.getEndAt();
                    try {
                        java.time.ZonedDateTime startZoned = b.getStartAt().atZone(java.time.ZoneId.of("Asia/Kolkata"));
                        java.time.ZonedDateTime endZoned = b.getEndAt().atZone(java.time.ZoneId.of("Asia/Kolkata"));
                        timeWindow = String.format("%s, %02d:%02d - %02d:%02d IST",
                                startZoned.toLocalDate().toString(),
                                startZoned.getHour(), startZoned.getMinute(),
                                endZoned.getHour(), endZoned.getMinute());
                    } catch (Exception ignored) {}

                    slots.add(com.championsclub.member.dto.BookedSlotDto.builder()
                            .id(b.getId())
                            .bookingReference(b.getBookingReference())
                            .courtName(courtName)
                            .sport(sport)
                            .startAt(b.getStartAt())
                            .endAt(b.getEndAt())
                            .timeWindow(timeWindow)
                            .status(b.getStatus() != null ? b.getStatus().name() : "CONFIRMED")
                            .build());
                    if (slots.size() >= 5) break;
                }
            }
        } catch (Exception ex) {
            log.warn("Failed to resolve booked slots for member {}: {}", member.getMemberNo(), ex.getMessage());
        }
        return slots;
    }

    @Transactional(readOnly = true)
    public Page<MemberCheckIn> getRecentCheckIns(Pageable pageable) {
        return checkInRepository.findByOrderByCheckedInAtDesc(pageable);
    }

    private Member resolveMember(CheckInRequest request) {
        if (request.getQrToken() != null && !request.getQrToken().isBlank()) {
            String rawToken = request.getQrToken().trim();
            String extractedToken = rawToken;

            if (rawToken.startsWith("{") && rawToken.endsWith("}")) {
                try {
                    com.fasterxml.jackson.databind.JsonNode node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(rawToken);
                    if (node.hasNonNull("token") && !node.get("token").asText().isBlank()) {
                        extractedToken = node.get("token").asText().trim();
                    } else if (node.hasNonNull("memberNo") && !node.get("memberNo").asText().isBlank()) {
                        final String mNo = node.get("memberNo").asText().trim().toUpperCase();
                        return memberRepository.findByMemberNoAndIsDeletedFalse(mNo)
                                .orElseThrow(() -> new ResourceNotFoundException("Member with number: " + mNo, "MEMBER_NOT_FOUND"));
                    }
                } catch (Exception e) {
                    log.warn("Could not parse JSON QR token: {}", e.getMessage());
                }
            }

            final String candidateToken = extractedToken;
            final String upperCandidate = candidateToken.toUpperCase();

            if (upperCandidate.startsWith("CC-")) {
                return memberRepository.findByMemberNoAndIsDeletedFalse(upperCandidate)
                        .orElseThrow(() -> new ResourceNotFoundException("Member with number: " + upperCandidate, "MEMBER_NOT_FOUND"));
            }

            try {
                QrCodeService.VerifiedQrToken verified = qrCodeService.verifyQrToken(candidateToken);
                return memberRepository.findByIdAndIsDeletedFalse(verified.memberId())
                        .orElseThrow(() -> new ResourceNotFoundException("Member", verified.memberId()));
            } catch (Exception ex) {
                Optional<Member> byMemberNo = memberRepository.findByMemberNoAndIsDeletedFalse(upperCandidate);
                if (byMemberNo.isPresent()) {
                    return byMemberNo.get();
                }
                Optional<Member> byEmail = memberRepository.findByEmailAndIsDeletedFalse(candidateToken.toLowerCase());
                if (byEmail.isPresent()) {
                    return byEmail.get();
                }
                throw ex;
            }
        }

        if (request.getMemberNo() != null && !request.getMemberNo().isBlank()) {
            return memberRepository.findByMemberNoAndIsDeletedFalse(request.getMemberNo().trim().toUpperCase())
                    .orElseThrow(() -> new ResourceNotFoundException("Member with number: " + request.getMemberNo(), "MEMBER_NOT_FOUND"));
        }

        if (request.getMemberId() != null) {
            return memberRepository.findByIdAndIsDeletedFalse(request.getMemberId())
                    .orElseThrow(() -> new ResourceNotFoundException("Member", request.getMemberId()));
        }

        throw new BusinessValidationException("QR token, member number, or member ID is required for check-in", "CHECKIN_IDENTIFIER_REQUIRED");
    }
}
