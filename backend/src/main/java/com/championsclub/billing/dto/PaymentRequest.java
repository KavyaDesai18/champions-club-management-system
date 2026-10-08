package com.championsclub.billing.dto;

import com.championsclub.billing.domain.PaymentMethod;
import com.championsclub.billing.domain.PaymentSourceType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentRequest {

    private UUID payerUserId;
    private UUID memberId;
    private UUID corporateAccountId;

    private String payerName;
    private String payerEmail;
    private String payerPhone;

    @NotNull(message = "Source type is required")
    private PaymentSourceType sourceType;

    @NotNull(message = "Source ID is required")
    private String sourceId;

    @NotNull(message = "Payment method is required")
    private PaymentMethod method;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.00", message = "Amount must be non-negative")
    private BigDecimal amount;

    @Builder.Default
    private String currency = "INR";

    // Gateway / Sim fields
    private String cardToken;
    private String cardNumber;
    private String cardExpiry;
    private String cardCvv;
    private String upiVpa;

    private String notes;
    private boolean managerOverride;
    private UUID cashDrawerSessionId;
}
