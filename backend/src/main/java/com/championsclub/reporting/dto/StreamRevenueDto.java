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
public class StreamRevenueDto {
    private String stream; // COURTS, SHOP, BAR, MEMBERSHIPS
    private String label;
    private BigDecimal amount;
    private BigDecimal percentage;
}
