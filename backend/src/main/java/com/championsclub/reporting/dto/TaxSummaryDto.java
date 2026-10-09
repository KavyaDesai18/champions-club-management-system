package com.championsclub.reporting.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaxSummaryDto {
    private BigDecimal totalGstCollected;
    private BigDecimal totalCgstCollected;
    private BigDecimal totalSgstCollected;
    private BigDecimal totalIgstCollected;
    private BigDecimal inputTaxCredit;
    private BigDecimal netGstPayable;
    private List<TaxRateBreakdownDto> rateBreakdown;
}
