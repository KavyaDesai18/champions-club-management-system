package com.championsclub.court.dto;

import com.championsclub.court.domain.DayType;
import com.championsclub.court.domain.TimeBand;
import jakarta.validation.constraints.NotNull;
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
public class CreatePricingRuleRequest {

    private UUID sportId;
    private UUID planId;

    @NotNull(message = "Day type is required")
    private DayType dayType;

    @NotNull(message = "Time band is required")
    private TimeBand timeBand;

    @NotNull(message = "Start time is required")
    private LocalTime startTime;

    @NotNull(message = "End time is required")
    private LocalTime endTime;

    @NotNull(message = "Price is required")
    private BigDecimal price;

    @Builder.Default
    private int priority = 0;

    private LocalDate validFrom;
    private LocalDate validTo;

    @Builder.Default
    private Boolean active = true;
}
