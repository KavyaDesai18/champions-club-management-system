package com.championsclub.member.dto;

import com.championsclub.common.security.Role;
import com.championsclub.member.domain.MembershipTier;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemberProfileDto {
    private UUID id;
    private String email;
    private String fullName;
    private String phone;
    private Role role;
    private MembershipTier tier;
    private BigDecimal walletBalance;
    private int guestPassesRemaining;
    private boolean active;
}
