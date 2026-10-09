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
public class PeriodComparisonDto {
    private BigDecimal previousRevenue;
    private BigDecimal revenueChangeAmount;
    private BigDecimal revenueChangePercentage;
    private BigDecimal previousNetPosition;
    private BigDecimal netPositionChangeAmount;
    private BigDecimal netPositionChangePercentage;
}
