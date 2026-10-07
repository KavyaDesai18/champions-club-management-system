package com.championsclub.court.dto;

import com.championsclub.court.domain.DayType;
import com.championsclub.court.domain.TimeBand;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PricingRuleDto {

    private UUID id;
    private UUID sportId;
    private String sportName;
    private UUID planId;
    private String planCode;
    private String planName;
    private DayType dayType;
    private TimeBand timeBand;
    private LocalTime startTime;
    private LocalTime endTime;
    private BigDecimal price;
    private int priority;
    private LocalDate validFrom;
    private LocalDate validTo;
    private boolean active;
}
