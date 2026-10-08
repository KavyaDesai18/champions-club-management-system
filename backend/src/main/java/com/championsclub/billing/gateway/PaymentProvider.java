package com.championsclub.billing.gateway;

import com.championsclub.billing.dto.PaymentIntentRequest;
import com.championsclub.billing.dto.PaymentIntentResponse;

import java.math.BigDecimal;

public interface PaymentProvider {

    PaymentIntentResponse createPaymentIntent(PaymentIntentRequest request);

    GatewayProcessResult processPayment(GatewayProcessRequest request);

    GatewayRefundResult processRefund(GatewayRefundRequest request);

    boolean verifyWebhookSignature(String rawPayload, String signature, String secret);

    GatewayStatusResult queryPaymentStatus(String providerRef);

    record GatewayProcessRequest(
            String paymentId,
            BigDecimal amount,
            String currency,
            String method,
            String cardNumber,
            String cardExpiry,
            String cardCvv,
            String cardToken,
            String upiVpa,
            String idempotencyKey
    ) {}

    record GatewayProcessResult(
            boolean successful,
            String providerRef,
            String status,
            String failureReason
    ) {}

    record GatewayRefundRequest(
            String paymentId,
            String providerRef,
            BigDecimal refundAmount,
            String currency,
            String reason
    ) {}

    record GatewayRefundResult(
            boolean successful,
            String providerRefundId,
            String failureReason
    ) {}

    record GatewayStatusResult(
            String status, // SUCCEEDED, FAILED, PENDING
            String providerRef,
            BigDecimal amount,
            String failureReason
    ) {}
}
