package com.championsclub.crm.dto;

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
public class PublicPlanDto {

    private String code;
    private String name;
    private String description;
    private BigDecimal price;
    private String billingCycle;
    private int durationMonths;
    private int bookingAdvanceDays;
    private int discountPercent;
    private int guestPassesPerMonth;
    private boolean gymAccess;
    private List<String> highlights;
    private boolean featured;
}
