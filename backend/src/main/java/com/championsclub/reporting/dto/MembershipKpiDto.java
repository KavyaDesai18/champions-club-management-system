package com.championsclub.reporting.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MembershipKpiDto {
    private long activeMembers;
    private long expiringSoon30Days;
    private long expiredOrChurnedMembers;
    private BigDecimal churnRatePercentage;
}
