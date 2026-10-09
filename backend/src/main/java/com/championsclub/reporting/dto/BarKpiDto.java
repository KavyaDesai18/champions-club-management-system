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
public class BarKpiDto {
    private long totalTabs;
    private long totalCovers;
    private BigDecimal totalRevenue;
    private BigDecimal averageTabAmount;
}
