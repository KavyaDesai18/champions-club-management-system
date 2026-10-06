package com.championsclub.member.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WalletTopUpRequest {

    @NotNull(message = "Top up amount is required")
    @DecimalMin(value = "1.00", message = "Top up amount must be at least 1.00")
    private BigDecimal amount;
}
