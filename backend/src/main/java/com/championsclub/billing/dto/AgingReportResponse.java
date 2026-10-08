package com.championsclub.billing.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgingReportResponse {

    private BigDecimal totalCurrent;
    private BigDecimal totalDays1to30;
    private BigDecimal totalDays31to60;
    private BigDecimal totalDays61to90;
    private BigDecimal totalDays90Plus;
    private BigDecimal totalOutstanding;

    private List<CorporateAgingItemDto> items;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CorporateAgingItemDto {
        private UUID corporateAccountId;
        private String companyName;
        private String gstin;
        private String paymentTerms;
        private BigDecimal creditLimit;
        private BigDecimal usedCredit;
        private BigDecimal current;
        private BigDecimal days1to30;
        private BigDecimal days31to60;
        private BigDecimal days61to90;
        private BigDecimal days90Plus;
        private BigDecimal totalDue;
    }
}
