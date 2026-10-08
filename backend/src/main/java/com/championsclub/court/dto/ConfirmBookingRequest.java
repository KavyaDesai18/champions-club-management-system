package com.championsclub.court.dto;

import com.championsclub.billing.domain.PaymentMethod;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConfirmBookingRequest {
    private PaymentMethod paymentMethod;
    private UUID corporateAccountId;
    private String cardNumber;
    private String cardExpiry;
    private String cardCvv;
    private String upiVpa;
    private UUID cashDrawerSessionId;
    private boolean managerOverride;
}
