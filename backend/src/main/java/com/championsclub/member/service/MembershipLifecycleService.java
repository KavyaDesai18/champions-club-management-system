package com.championsclub.member.service;

import com.championsclub.common.audit.AuditService;
import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.common.time.ClubTimeUtils;
import com.championsclub.member.domain.Member;
import com.championsclub.member.domain.MemberStatus;
import com.championsclub.member.domain.Membership;
import com.championsclub.member.domain.MembershipEvent;
import com.championsclub.member.domain.MembershipEventType;
import com.championsclub.member.domain.MembershipStatus;
import com.championsclub.member.domain.Plan;
import com.championsclub.member.dto.ChangePlanRequest;
import com.championsclub.member.dto.ExpiringMembershipDto;
import com.championsclub.member.dto.MembershipDto;
import com.championsclub.member.dto.MembershipEventDto;
import com.championsclub.member.dto.RenewMembershipRequest;
import com.championsclub.member.refund.MembershipRefundHook;
import com.championsclub.member.refund.RefundResult;
import com.championsclub.member.repo.MemberRepository;
import com.championsclub.member.repo.MembershipEventRepository;
import com.championsclub.member.repo.MembershipRepository;
import com.championsclub.notification.domain.NotificationType;
import com.championsclub.notification.service.NotificationDispatcher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class MembershipLifecycleService {

    private static final Logger log = LoggerFactory.getLogger(MembershipLifecycleService.class);

    private final MembershipRepository membershipRepository;
    private final MembershipEventRepository eventRepository;
    private final MemberRepository memberRepository;
    private final PlanService planService;
    private final MembershipDateCalculator dateCalculator;
    private final MembershipRefundHook refundHook;
    private final NotificationDispatcher notificationDispatcher;
    private final ClubTimeUtils timeUtils;
    private final AuditService auditService;
    private final int gracePeriodDays;

    public MembershipLifecycleService(
            MembershipRepository membershipRepository,
            MembershipEventRepository eventRepository,
            MemberRepository memberRepository,
            PlanService planService,
            MembershipDateCalculator dateCalculator,
            MembershipRefundHook refundHook,
            NotificationDispatcher notificationDispatcher,
            ClubTimeUtils timeUtils,
            AuditService auditService,
            @Value("${app.membership.grace-period-days:0}") int gracePeriodDays
    ) {
        this.membershipRepository = membershipRepository;
        this.eventRepository = eventRepository;
        this.memberRepository = memberRepository;
        this.planService = planService;
        this.dateCalculator = dateCalculator;
        this.refundHook = refundHook;
        this.notificationDispatcher = notificationDispatcher;
        this.timeUtils = timeUtils;
        this.auditService = auditService;
        this.gracePeriodDays = gracePeriodDays;
    }

    /**
     * Initializes an active membership for a newly created member.
     */
    @Transactional
    public Membership createInitialMembership(
            Member member,
            Plan plan,
            LocalDate startDate,
            LocalDate endDate,
            BigDecimal pricePaid,
            String paymentRef,
            String actor
    ) {
        Membership membership = Membership.builder()
                .member(member)
                .plan(plan)
                .startDate(startDate)
                .endDate(endDate)
                .status(MembershipStatus.ACTIVE)
                .pricePaid(pricePaid != null ? pricePaid : (plan != null ? plan.getPrice() : BigDecimal.ZERO))
                .paymentRef(paymentRef != null ? paymentRef : "PAY-INIT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .user(member.getUser())
                .walletBalance(member.getWalletBalance())
                .guestPassesRemaining(member.getGuestPassesRemaining())
                .active(true)
                .createdAt(timeUtils.now())
                .updatedAt(timeUtils.now())
                .build();

        membership = membershipRepository.save(membership);

        recordEvent(
                membership,
                member,
                MembershipEventType.CREATED,
                null,
                MembershipStatus.ACTIVE.name(),
                startDate,
                actor,
                "Initial membership created for plan: " + (plan != null ? plan.getCode() : "CUSTOM"),
                null
        );

        return membership;
    }

    /**
     * Renew membership according to the non-negotiable rules:
     * - Renewal before or on expiry date extends from current end_date (no lost days).
     * - Renewal after expiry starts today.
     * - Exactly one ACTIVE membership per member.
     */
    @Transactional
    public MembershipDto renewMembership(UUID memberId, RenewMembershipRequest request, String actor) {
        Member member = memberRepository.findByIdAndIsDeletedFalse(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Member", memberId));

        LocalDate today = timeUtils.currentClubDate();
        Optional<Membership> currentActiveOpt = membershipRepository.findActiveByMemberId(memberId);

        Plan targetPlan = request.getPlanCode() != null && !request.getPlanCode().isBlank()
                ? planService.getPlanByCode(request.getPlanCode())
                : (currentActiveOpt.isPresent() && currentActiveOpt.get().getPlan() != null
                        ? currentActiveOpt.get().getPlan()
                        : member.getPlan());

        if (targetPlan == null) {
            throw new BusinessValidationException("Target membership plan could not be determined", "PLAN_REQUIRED");
        }

        LocalDate currentEndDate = currentActiveOpt.map(Membership::getEndDate).orElse(member.getEndDate());
        MembershipDateCalculator.RenewalDates renewalDates = dateCalculator.calculateRenewalDates(
                currentEndDate,
                today,
                targetPlan.getDurationMonths()
        );

        BigDecimal pricePaid = request.getPricePaid() != null ? request.getPricePaid() : targetPlan.getPrice();
        String paymentRef = request.getPaymentRef() != null && !request.getPaymentRef().isBlank()
                ? request.getPaymentRef()
                : "PAY-RNW-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        UUID renewedFromId = null;

        // Transition existing active membership if present
        if (currentActiveOpt.isPresent()) {
            Membership oldActive = currentActiveOpt.get();
            renewedFromId = oldActive.getId();
            oldActive.setStatus(MembershipStatus.EXPIRED);
            oldActive.setActive(false);
            oldActive.setUpdatedAt(timeUtils.now());
            membershipRepository.save(oldActive);
        }

        // Create new ACTIVE membership
        Membership newMembership = Membership.builder()
                .member(member)
                .plan(targetPlan)
                .startDate(renewalDates.startDate())
                .endDate(renewalDates.endDate())
                .status(MembershipStatus.ACTIVE)
                .pricePaid(pricePaid)
                .paymentRef(paymentRef)
                .renewedFrom(renewedFromId)
                .user(member.getUser())
                .walletBalance(member.getWalletBalance())
                .guestPassesRemaining(member.getGuestPassesRemaining())
                .active(true)
                .createdAt(timeUtils.now())
                .updatedAt(timeUtils.now())
                .build();

        newMembership = membershipRepository.save(newMembership);

        // Synchronize Member entity
        member.setPlan(targetPlan);
        member.setEndDate(renewalDates.endDate());
        member.setStatus(MemberStatus.ACTIVE);
        member.setUpdatedAt(timeUtils.now());
        memberRepository.save(member);

        recordEvent(
                newMembership,
                member,
                MembershipEventType.RENEWED,
                currentActiveOpt.isPresent() ? currentActiveOpt.get().getStatus().name() : null,
                MembershipStatus.ACTIVE.name(),
                today,
                actor,
                "Renewed to plan " + targetPlan.getCode() + ". Validity extended to " + renewalDates.endDate(),
                request.getNotes()
        );

        auditService.log(
                "MEMBERSHIP_RENEWED",
                "Renewed member " + member.getMemberNo() + " until " + renewalDates.endDate() + " on plan " + targetPlan.getCode(),
                actor,
                member.getId()
        );

        // Dispatch in-app + email + SMS notification
        notificationDispatcher.dispatch(
                member.getUser(),
                member,
                "Membership Renewed!",
                String.format("Your %s membership has been successfully renewed. Your new validity runs through %s.",
                        targetPlan.getName(), renewalDates.endDate()),
                NotificationType.MEMBERSHIP_RENEWED,
                "{\"planCode\":\"" + targetPlan.getCode() + "\",\"endDate\":\"" + renewalDates.endDate() + "\"}"
        );

        return MembershipDto.fromEntity(newMembership, today);
    }

    /**
     * Mid-term plan upgrade / downgrade:
     * - Prorates remaining days from previous membership.
     * - Applies unused balance as credit against new plan price.
     * - Any excess credit is credited to the member's wallet!
     */
    @Transactional
    public MembershipDto processMidTermPlanChange(UUID memberId, ChangePlanRequest request, String actor) {
        Member member = memberRepository.findByIdAndIsDeletedFalse(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Member", memberId));

        LocalDate today = timeUtils.currentClubDate();
        Plan newPlan = planService.getPlanByCode(request.getPlanCode());

        Optional<Membership> currentActiveOpt = membershipRepository.findActiveByMemberId(memberId);
        MembershipDateCalculator.ProrationResult proration;
        UUID oldMembershipId = null;

        if (currentActiveOpt.isPresent()) {
            Membership oldActive = currentActiveOpt.get();
            oldMembershipId = oldActive.getId();
            proration = dateCalculator.calculateProration(
                    oldActive.getPricePaid(),
                    oldActive.getStartDate(),
                    oldActive.getEndDate(),
                    today,
                    newPlan.getPrice()
            );

            // Mark old membership superseded
            oldActive.setStatus(MembershipStatus.CANCELLED);
            oldActive.setActive(false);
            oldActive.setUpdatedAt(timeUtils.now());
            membershipRepository.save(oldActive);
        } else {
            proration = new MembershipDateCalculator.ProrationResult(BigDecimal.ZERO, newPlan.getPrice(), BigDecimal.ZERO);
        }

        // Apply excess wallet credit if downgrade or unused balance exceeds new plan price
        if (proration.walletCredit().compareTo(BigDecimal.ZERO) > 0) {
            member.setWalletBalance(member.getWalletBalance().add(proration.walletCredit()));
            log.info("Prorated downgrade credit of {} added to wallet for member {}", proration.walletCredit(), member.getMemberNo());
        }

        LocalDate newStartDate = today;
        LocalDate newEndDate = today.plusMonths(newPlan.getDurationMonths());

        Membership newMembership = Membership.builder()
                .member(member)
                .plan(newPlan)
                .startDate(newStartDate)
                .endDate(newEndDate)
                .status(MembershipStatus.ACTIVE)
                .pricePaid(proration.netPayable())
                .paymentRef("PAY-MIGRATION-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .renewedFrom(oldMembershipId)
                .user(member.getUser())
                .walletBalance(member.getWalletBalance())
                .guestPassesRemaining(member.getGuestPassesRemaining())
                .active(true)
                .createdAt(timeUtils.now())
                .updatedAt(timeUtils.now())
                .build();

        newMembership = membershipRepository.save(newMembership);

        // Update member record
        member.setPlan(newPlan);
        member.setEndDate(newEndDate);
        member.setStatus(MemberStatus.ACTIVE);
        member.setUpdatedAt(timeUtils.now());
        memberRepository.save(member);

        MembershipEventType eventType = proration.unusedCredit().compareTo(newPlan.getPrice()) <= 0
                ? MembershipEventType.UPGRADED
                : MembershipEventType.DOWNGRADED;

        recordEvent(
                newMembership,
                member,
                eventType,
                currentActiveOpt.map(m -> m.getPlan().getCode()).orElse("NONE"),
                newPlan.getCode(),
                today,
                actor,
                String.format("Migrated to %s plan. Prorated credit: %s, Net payable: %s, Wallet credit: %s. Reason: %s",
                        newPlan.getCode(), proration.unusedCredit(), proration.netPayable(), proration.walletCredit(), request.getReason()),
                "{\"unusedCredit\":" + proration.unusedCredit() + ",\"netPayable\":" + proration.netPayable() + "}"
        );

        auditService.log(
                "MEMBERSHIP_PLAN_CHANGED",
                "Changed plan for " + member.getMemberNo() + " to " + newPlan.getCode() + ". Prorated credit applied.",
                actor,
                member.getId()
        );

        return MembershipDto.fromEntity(newMembership, today);
    }

    /**
     * Member suspension:
     * Records suspension start date to track freeze days upon reactivation.
     */
    @Transactional
    public void handleMemberSuspension(UUID memberId, String reason, String actor) {
        Member member = memberRepository.findByIdAndIsDeletedFalse(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Member", memberId));

        LocalDate today = timeUtils.currentClubDate();
        member.setStatus(MemberStatus.SUSPENDED);
        member.setSuspendedAt(today);
        member.setUpdatedAt(timeUtils.now());
        memberRepository.save(member);

        Optional<Membership> activeMembership = membershipRepository.findActiveByMemberId(memberId);
        activeMembership.ifPresent(m -> {
            recordEvent(
                    m,
                    member,
                    MembershipEventType.SUSPENDED,
                    MemberStatus.ACTIVE.name(),
                    MemberStatus.SUSPENDED.name(),
                    today,
                    actor,
                    "Suspended member account. Reason: " + reason,
                    null
            );
        });

        auditService.log("MEMBER_SUSPENDED", "Suspended member " + member.getMemberNo() + ". Reason: " + reason, actor, memberId);
    }

    /**
     * Member reactivation with freeze days extension:
     * Computes days spent suspended and extends membership end date.
     */
    @Transactional
    public void handleMemberReactivation(UUID memberId, String actor) {
        Member member = memberRepository.findByIdAndIsDeletedFalse(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Member", memberId));

        LocalDate today = timeUtils.currentClubDate();
        LocalDate suspendedAt = member.getSuspendedAt();
        long freezeDays = dateCalculator.calculateFreezeDays(suspendedAt, today);

        Optional<Membership> activeMembership = membershipRepository.findActiveByMemberId(memberId);

        if (activeMembership.isPresent() && freezeDays > 0) {
            Membership membership = activeMembership.get();
            LocalDate oldEndDate = membership.getEndDate();
            LocalDate extendedEndDate = dateCalculator.applyFreezeDays(oldEndDate, freezeDays);

            membership.setEndDate(extendedEndDate);
            membership.setFreezeDays(membership.getFreezeDays() + (int) freezeDays);
            membership.setUpdatedAt(timeUtils.now());
            membershipRepository.save(membership);

            member.setEndDate(extendedEndDate);
            log.info("Applied {} freeze days for reactivated member {}. New end date: {}", freezeDays, member.getMemberNo(), extendedEndDate);

            recordEvent(
                    membership,
                    member,
                    MembershipEventType.REACTIVATED,
                    MemberStatus.SUSPENDED.name(),
                    MemberStatus.ACTIVE.name(),
                    today,
                    actor,
                    String.format("Reactivated member. Added %d freeze days; validity extended from %s to %s.",
                            freezeDays, oldEndDate, extendedEndDate),
                    "{\"freezeDays\":" + freezeDays + ",\"newEndDate\":\"" + extendedEndDate + "\"}"
            );
        }

        member.setStatus(MemberStatus.ACTIVE);
        member.setSuspendedAt(null);
        member.setUpdatedAt(timeUtils.now());
        memberRepository.save(member);

        auditService.log("MEMBER_REACTIVATED", "Reactivated member " + member.getMemberNo() + " with " + freezeDays + " freeze days", actor, memberId);
    }

    /**
     * Cancels membership and triggers the P10 refund hook.
     */
    @Transactional
    public RefundResult cancelMembership(UUID memberId, String reason, String actor) {
        Member member = memberRepository.findByIdAndIsDeletedFalse(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Member", memberId));

        Membership activeMembership = membershipRepository.findActiveByMemberId(memberId)
                .orElseThrow(() -> new BusinessValidationException("No active membership found to cancel", "NO_ACTIVE_MEMBERSHIP"));

        LocalDate today = timeUtils.currentClubDate();
        activeMembership.setStatus(MembershipStatus.CANCELLED);
        activeMembership.setActive(false);
        activeMembership.setUpdatedAt(timeUtils.now());
        membershipRepository.save(activeMembership);

        member.setStatus(MemberStatus.CANCELLED);
        member.setUpdatedAt(timeUtils.now());
        memberRepository.save(member);

        RefundResult refundResult = refundHook.calculateAndProcessRefund(activeMembership, reason, actor);

        recordEvent(
                activeMembership,
                member,
                MembershipEventType.CANCELLED,
                MembershipStatus.ACTIVE.name(),
                MembershipStatus.CANCELLED.name(),
                today,
                actor,
                "Cancelled membership. " + refundResult.getNote(),
                "{\"refundAmount\":" + refundResult.getRefundableAmount() + ",\"refundRef\":\"" + refundResult.getRefundReference() + "\"}"
        );

        auditService.log("MEMBERSHIP_CANCELLED", "Cancelled membership for " + member.getMemberNo() + ". Refund ref: " + refundResult.getRefundReference(), actor, memberId);
        return refundResult;
    }

    @Transactional(readOnly = true)
    public MembershipDto getActiveMembership(UUID memberId) {
        LocalDate today = timeUtils.currentClubDate();
        return membershipRepository.findActiveByMemberId(memberId)
                .map(m -> MembershipDto.fromEntity(m, today))
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<MembershipDto> getMembershipHistory(UUID memberId) {
        LocalDate today = timeUtils.currentClubDate();
        return membershipRepository.findByMemberIdOrderByCreatedAtDesc(memberId).stream()
                .map(m -> MembershipDto.fromEntity(m, today))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MembershipEventDto> getMembershipEvents(UUID memberId) {
        return eventRepository.findByMemberIdOrderByCreatedAtDesc(memberId).stream()
                .map(MembershipEventDto::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<ExpiringMembershipDto> searchExpiringMemberships(
            String search,
            String statusStr,
            String planCode,
            Integer daysWindow,
            Pageable pageable
    ) {
        LocalDate today = timeUtils.currentClubDate();
        MembershipStatus status = statusStr != null && !statusStr.isBlank()
                ? MembershipStatus.valueOf(statusStr.toUpperCase().trim())
                : null;

        LocalDate minEndDate = null;
        LocalDate maxEndDate = null;

        if (daysWindow != null && daysWindow > 0) {
            minEndDate = today;
            maxEndDate = today.plusDays(daysWindow);
        } else if (daysWindow != null && daysWindow <= 0) {
            // Already expired
            maxEndDate = today.minusDays(1);
        }

        return membershipRepository.searchExpiringMemberships(
                search != null && !search.isBlank() ? search.trim() : null,
                status,
                planCode != null && !planCode.isBlank() ? planCode.trim() : null,
                minEndDate,
                maxEndDate,
                pageable
        ).map(m -> ExpiringMembershipDto.fromEntity(m, today));
    }

    private void recordEvent(
            Membership membership,
            Member member,
            MembershipEventType type,
            String fromStatus,
            String toStatus,
            LocalDate effectiveDate,
            String actor,
            String reason,
            String metadataJson
    ) {
        MembershipEvent event = MembershipEvent.builder()
                .membership(membership)
                .member(member)
                .eventType(type)
                .fromStatus(fromStatus)
                .toStatus(toStatus)
                .effectiveDate(effectiveDate)
                .actor(actor != null ? actor : "SYSTEM")
                .reason(reason)
                .metadataJson(metadataJson)
                .createdAt(timeUtils.now())
                .build();
        eventRepository.save(event);
    }
}
