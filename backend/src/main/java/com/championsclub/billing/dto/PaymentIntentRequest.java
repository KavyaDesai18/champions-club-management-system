package com.championsclub.billing.dto;

import com.championsclub.billing.domain.PaymentMethod;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentIntentRequest {
    private UUID paymentId;
    private BigDecimal amount;
    private String currency;
    private PaymentMethod method;
    private String description;
    private String customerEmail;
    private String customerPhone;
}
