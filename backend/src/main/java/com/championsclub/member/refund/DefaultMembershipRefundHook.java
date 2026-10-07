package com.championsclub.member.refund;

import com.championsclub.common.audit.AuditService;
import com.championsclub.common.time.ClubTimeUtils;
import com.championsclub.member.domain.Member;
import com.championsclub.member.domain.Membership;
import com.championsclub.member.repo.MemberRepository;
import com.championsclub.member.service.MembershipDateCalculator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Component
public class DefaultMembershipRefundHook implements MembershipRefundHook {

    private static final Logger log = LoggerFactory.getLogger(DefaultMembershipRefundHook.class);

    private final MembershipDateCalculator dateCalculator;
    private final MemberRepository memberRepository;
    private final ClubTimeUtils timeUtils;
    private final AuditService auditService;

    public DefaultMembershipRefundHook(
            MembershipDateCalculator dateCalculator,
            MemberRepository memberRepository,
            ClubTimeUtils timeUtils,
            AuditService auditService
    ) {
        this.dateCalculator = dateCalculator;
        this.memberRepository = memberRepository;
        this.timeUtils = timeUtils;
        this.auditService = auditService;
    }

    @Override
    public RefundResult calculateAndProcessRefund(Membership membership, String reason, String actor) {
        LocalDate today = timeUtils.currentClubDate();
        MembershipDateCalculator.ProrationResult proration = dateCalculator.calculateProration(
                membership.getPricePaid(),
                membership.getStartDate(),
                membership.getEndDate(),
                today,
                BigDecimal.ZERO
        );

        BigDecimal refundableAmount = proration.unusedCredit();
        String refundRef = "REF-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();

        log.info("[REFUND-HOOK-STUB] Processing refund for membership {}, member {}: Amount: {}, Reason: '{}'",
                membership.getId(), membership.getMember() != null ? membership.getMember().getMemberNo() : "N/A",
                refundableAmount, reason);

        // Optionally credit member's internal club wallet
        if (membership.getMember() != null && refundableAmount.compareTo(BigDecimal.ZERO) > 0) {
            Member member = membership.getMember();
            member.setWalletBalance(member.getWalletBalance().add(refundableAmount));
            memberRepository.save(member);
        }

        auditService.log(
                "MEMBERSHIP_REFUND_PROCESSED",
                String.format("Refund %s: Processed prorated refund of %s for cancelled membership. Reason: %s",
                        refundRef, refundableAmount, reason),
                actor,
                membership.getId()
        );

        return RefundResult.builder()
                .success(true)
                .refundableAmount(refundableAmount)
                .refundReference(refundRef)
                .note("Prorated unused membership balance credited to member wallet. Extension stub ready for P10 payment gateway.")
                .build();
    }
}
