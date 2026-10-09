package com.championsclub.reporting.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinancialSummaryDto {
    private String preset; // TODAY, THIS_WEEK, THIS_MONTH, LAST_MONTH, CUSTOM
    private LocalDate startDate;
    private LocalDate endDate;
    private String currency;

    // Revenue
    private BigDecimal totalRevenue;
    private List<StreamRevenueDto> revenueByStream;
    private Map<String, BigDecimal> revenueByPaymentMethod;
    private BigDecimal totalRefunds;
    private BigDecimal netRevenue; // totalRevenue - totalRefunds

    // Tax
    private TaxSummaryDto taxSummary;

    // Receivables ("What is owed to us")
    private BigDecimal totalReceivables;
    private AgingBucketsDto receivablesAging;

    // Payables ("What we owe")
    private BigDecimal totalPayables;
    private PayablesBreakdownDto payablesBreakdown;
    private AgingBucketsDto payablesAging;

    // Cash & Bank Position
    private BigDecimal cashAndBank;

    // Core Formula: Net Position = Receivables + Cash/Bank - Payables
    private BigDecimal netPosition;

    // Trend & Comparative series
    private List<DailyTrendPointDto> dailyTrend;
    private PeriodComparisonDto comparison;
}
