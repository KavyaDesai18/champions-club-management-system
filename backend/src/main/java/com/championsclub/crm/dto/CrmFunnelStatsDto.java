package com.championsclub.crm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CrmFunnelStatsDto {

    private long totalLeads;
    private long newCount;
    private long contactedCount;
    private long quoteSentCount;
    private long trialBookedCount;
    private long wonCount;
    private long lostCount;
    private BigDecimal winRatePercentage;
    private long overdueFollowUpsCount;
    private long activeQuotesCount;
}
