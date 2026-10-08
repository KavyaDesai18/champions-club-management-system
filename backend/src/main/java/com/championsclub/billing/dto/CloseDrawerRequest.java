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
public class CloseDrawerRequest {

    @NotNull(message = "Closing cash counted is required")
    @DecimalMin(value = "0.00", message = "Closing cash must be non-negative")
    private BigDecimal closingCashCounted;

    private String notes;
}
