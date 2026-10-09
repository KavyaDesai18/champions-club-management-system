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
public class LeadFunnelDto {
    private long totalLeads;
    private long newLeads;
    private long contactedLeads;
    private long quoteOrTrialLeads;
    private long wonLeads;
    private long lostLeads;
    private BigDecimal conversionRatePercentage;
}
