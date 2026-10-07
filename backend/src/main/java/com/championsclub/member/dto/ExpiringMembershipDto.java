package com.championsclub.member.dto;

import com.championsclub.member.domain.Membership;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Value
@Builder
public class ExpiringMembershipDto {
    UUID membershipId;
    UUID memberId;
    String memberNo;
    String fullName;
    String phone;
    String email;
    String planCode;
    String planName;
    LocalDate startDate;
    LocalDate endDate;
    long daysLeft;
    String status;

    public static ExpiringMembershipDto fromEntity(Membership m, LocalDate today) {
        long daysLeft = m.getEndDate() != null ? Math.max(0, ChronoUnit.DAYS.between(today, m.getEndDate())) : 0;
        return ExpiringMembershipDto.builder()
                .membershipId(m.getId())
                .memberId(m.getMember() != null ? m.getMember().getId() : null)
                .memberNo(m.getMember() != null ? m.getMember().getMemberNo() : null)
                .fullName(m.getMember() != null ? m.getMember().getFullName() : null)
                .phone(m.getMember() != null ? m.getMember().getPhone() : null)
                .email(m.getMember() != null ? m.getMember().getEmail() : null)
                .planCode(m.getPlan() != null ? m.getPlan().getCode() : null)
                .planName(m.getPlan() != null ? m.getPlan().getName() : null)
                .startDate(m.getStartDate())
                .endDate(m.getEndDate())
                .daysLeft(daysLeft)
                .status(m.getStatus() != null ? m.getStatus().name() : "ACTIVE")
                .build();
    }
}
