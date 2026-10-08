package com.championsclub.billing.dto;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WebhookPayload {
    private String eventId;
    private String eventType; // e.g. "payment.succeeded", "payment.failed"
    private String paymentId;
    private String providerRef;
    private BigDecimal amount;
    private String status;
    private String failureReason;
    private long timestamp;
}
