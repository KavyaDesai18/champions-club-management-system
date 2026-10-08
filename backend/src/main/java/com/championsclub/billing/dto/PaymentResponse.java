package com.championsclub.billing.dto;

import com.championsclub.billing.domain.PaymentMethod;
import com.championsclub.billing.domain.PaymentSourceType;
import com.championsclub.billing.domain.PaymentStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentResponse {

    private UUID id;
    private UUID payerUserId;
    private UUID memberId;
    private UUID corporateAccountId;
    private String corporateCompanyName;
    private String payerName;
    private String payerEmail;
    private String payerPhone;

    private PaymentSourceType sourceType;
    private String sourceId;
    private PaymentMethod method;
    private BigDecimal amount;
    private String currency;
    private PaymentStatus status;
    private String providerRef;
    private String idempotencyKey;
    private UUID splitGroupId;
    private UUID cashDrawerSessionId;
    private String failureReason;
    private String invoiceNumber;
    private UUID invoiceId;
    private Instant createdAt;
}
