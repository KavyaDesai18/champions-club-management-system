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
public class CourtUtilizationDto {
    private BigDecimal utilizationPercentage;
    private long totalAvailableHours;
    private long totalBookedHours;
    private long totalBookings;
    private long confirmedBookings;
    private long cancelledBookings;
    private BigDecimal cancellationRatePercentage;
    private long noShowBookings;
    private BigDecimal noShowRatePercentage;
}
