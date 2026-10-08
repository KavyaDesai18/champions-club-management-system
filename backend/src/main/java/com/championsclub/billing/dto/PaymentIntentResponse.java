package com.championsclub.billing.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentIntentResponse {
    private String intentId;
    private String clientSecret;
    private BigDecimal amount;
    private String currency;
    private String status;
    private String upiQrString;
    private UUID paymentId;
}
