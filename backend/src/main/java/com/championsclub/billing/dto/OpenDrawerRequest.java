package com.championsclub.billing.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OpenDrawerRequest {

    @NotNull(message = "Opening balance is required")
    @DecimalMin(value = "0.00", message = "Opening balance must be non-negative")
    private BigDecimal openingBalance;

    private String notes;
}
