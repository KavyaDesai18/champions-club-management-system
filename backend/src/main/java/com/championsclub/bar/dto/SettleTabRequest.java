package com.championsclub.bar.dto;

import com.championsclub.billing.domain.PaymentMethod;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SettleTabRequest {

    @NotNull(message = "Payment method is required")
    private PaymentMethod paymentMethod;

    private BigDecimal tipAmount;

    private UUID splitId;

    private BigDecimal paidAmount;

    private String notes;
}
