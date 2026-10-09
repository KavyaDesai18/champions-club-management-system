package com.championsclub.bar.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OpenShiftRequest {
    @NotBlank(message = "Station is required (e.g. BAR, KITCHEN, POS)")
    private String station;

    @NotNull(message = "Opening cash float is required")
    private BigDecimal openingCash;

    private String notes;
}
