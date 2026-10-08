package com.championsclub.billing.dto;

import com.championsclub.billing.domain.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SplitItemDto {

    @NotNull(message = "Payment method is required")
    private PaymentMethod method;

    @NotNull(message = "Split amount is required")
    @DecimalMin(value = "0.01", message = "Split amount must be positive")
    private BigDecimal amount;

    private String cardToken;
    private String cardNumber;
    private String upiVpa;
    private String notes;
}
