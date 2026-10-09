package com.championsclub.bar.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyCloseReportDto {
    private LocalDate reportDate;
    private BigDecimal totalGrossRevenue;
    private BigDecimal totalNetRevenue;
    private BigDecimal totalDiscounts;
    private BigDecimal totalTaxCollected;
    private BigDecimal totalTips;
    private Integer totalTabsSettled;
    private Integer totalVoidedItemsCount;
    private BigDecimal totalVoidedAmount;
    private BigDecimal totalOpeningCash;
    private BigDecimal totalClosingCash;
    private BigDecimal totalCashVariance;

    private Map<String, BigDecimal> revenueByCategory;
    private Map<String, BigDecimal> revenueByPaymentMethod;

    // Ledger reconciliation check
    private Boolean ledgerReconciled;
    private BigDecimal ledgerBarRevenueDebitCredit;
    private BigDecimal ledgerTaxPayable;
    private String reconciliationStatusMessage;

    // Carried forward open tabs
    private List<TabDto> carriedForwardTabs;
}
