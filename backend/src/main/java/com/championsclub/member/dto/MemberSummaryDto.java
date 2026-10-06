package com.championsclub.member.dto;

import com.championsclub.member.domain.Member;
import com.championsclub.member.domain.MemberStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemberSummaryDto {
    private UUID id;
    private String memberNo;
    private String fullName;
    private String email;
    private String phone;
    private LocalDate dob;
    private Integer age;
    private String gender;
    private String photoUrl;
    private MemberStatus status;
    private String planCode;
    private String planName;
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal walletBalance;
    private Integer guestPassesRemaining;
    private Boolean isMinor;
    private Boolean upgradeDue;
    private String guardianName;
    private String guardianPhone;

    public static MemberSummaryDto fromEntity(Member member, LocalDate today) {
        if (member == null) return null;
        int age = member.calculateAge(today);
        boolean isMinor = member.isMinor(today);
        boolean upgradeDue = member.isUpgradeDue(today);

        String guardianName = member.getGuardian() != null ? member.getGuardian().getName() : null;
        String guardianPhone = member.getGuardian() != null ? member.getGuardian().getPhone() : null;

        return MemberSummaryDto.builder()
                .id(member.getId())
                .memberNo(member.getMemberNo())
                .fullName(member.getFullName())
                .email(member.getEmail())
                .phone(member.getPhone())
                .dob(member.getDob())
                .age(age)
                .gender(member.getGender())
                .photoUrl(member.getPhotoUrl())
                .status(member.getStatus())
                .planCode(member.getPlan() != null ? member.getPlan().getCode() : null)
                .planName(member.getPlan() != null ? member.getPlan().getName() : null)
                .startDate(member.getStartDate())
                .endDate(member.getEndDate())
                .walletBalance(member.getWalletBalance())
                .guestPassesRemaining(member.getGuestPassesRemaining())
                .isMinor(isMinor)
                .upgradeDue(upgradeDue)
                .guardianName(guardianName)
                .guardianPhone(guardianPhone)
                .build();
    }
}
