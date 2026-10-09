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

        return CheckInResponse.builder()
                .memberId(member.getId())
                .memberNo(member.getMemberNo())
                .fullName(member.getFullName())
                .photoUrl(member.getPhotoUrl())
                .statusBanner(statusBanner.name())
                .daysLeft(daysLeft)
                .endDate(member.getEndDate())
                .planCode(member.getPlan() != null ? member.getPlan().getCode() : "N/A")
                .planName(member.getPlan() != null ? member.getPlan().getName() : "No Plan")
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

    @Transactional(readOnly = true)
    public Page<MemberCheckIn> getRecentCheckIns(Pageable pageable) {
        return checkInRepository.findByOrderByCheckedInAtDesc(pageable);
    }

    private Member resolveMember(CheckInRequest request) {
        if (request.getQrToken() != null && !request.getQrToken().isBlank()) {
            QrCodeService.VerifiedQrToken verified = qrCodeService.verifyQrToken(request.getQrToken().trim());
            return memberRepository.findByIdAndIsDeletedFalse(verified.memberId())
                    .orElseThrow(() -> new ResourceNotFoundException("Member", verified.memberId()));
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
