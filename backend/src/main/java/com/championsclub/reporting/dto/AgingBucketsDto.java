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
public class AgingBucketsDto {
    private BigDecimal currentOrDueSoon; // Due within next 30 days or not overdue
    private BigDecimal overdueDays1To30;  // 1-30 days overdue
    private BigDecimal overdueDays31To60; // 31-60 days overdue
    private BigDecimal overdueDays61To90; // 61-90 days overdue
    private BigDecimal overdueDays90Plus; // >90 days overdue
    private BigDecimal total;
}
