package com.championsclub.reporting.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyTrendPointDto {
    private LocalDate date;
    private String label; // "2026-10-01" or "Oct 01"
    private BigDecimal courts;
    private BigDecimal shop;
    private BigDecimal bar;
    private BigDecimal memberships;
    private BigDecimal totalRevenue;
    private BigDecimal refunds;
    private BigDecimal netRevenue;
}
