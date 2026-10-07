package com.championsclub.member.dto;

import com.championsclub.member.domain.Membership;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Value
@Builder
public class MembershipDto {
    UUID id;
    UUID memberId;
    String memberNo;
    String planCode;
    String planName;
    LocalDate startDate;
    LocalDate endDate;
    String status;
    BigDecimal pricePaid;
    String paymentRef;
    UUID renewedFrom;
    int freezeDays;
    long daysLeft;
    boolean expired;

    public static MembershipDto fromEntity(Membership m, LocalDate today) {
        long daysLeft = m.getEndDate() != null ? Math.max(0, ChronoUnit.DAYS.between(today, m.getEndDate())) : 0;
        boolean expired = m.getEndDate() != null && today.isAfter(m.getEndDate());

        return MembershipDto.builder()
                .id(m.getId())
                .memberId(m.getMember() != null ? m.getMember().getId() : null)
                .memberNo(m.getMember() != null ? m.getMember().getMemberNo() : null)
                .planCode(m.getPlan() != null ? m.getPlan().getCode() : null)
                .planName(m.getPlan() != null ? m.getPlan().getName() : null)
                .startDate(m.getStartDate())
                .endDate(m.getEndDate())
                .status(m.getStatus() != null ? m.getStatus().name() : "ACTIVE")
                .pricePaid(m.getPricePaid())
                .paymentRef(m.getPaymentRef())
                .renewedFrom(m.getRenewedFrom())
                .freezeDays(m.getFreezeDays())
                .daysLeft(daysLeft)
                .expired(expired)
                .build();
    }
}
