package com.championsclub.billing.gateway;

import com.championsclub.billing.dto.PaymentIntentRequest;
import com.championsclub.billing.dto.PaymentIntentResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.UUID;

@Component
public class SimulatedGateway implements PaymentProvider {

    private static final Logger log = LoggerFactory.getLogger(SimulatedGateway.class);

    private final String webhookSecret;

    public SimulatedGateway(@Value("${app.billing.webhook-secret:cc_sec_simulated_webhook_key_2026}") String webhookSecret) {
        this.webhookSecret = webhookSecret;
    }

    public String getWebhookSecret() {
        return webhookSecret;
    }

    @Override
    public PaymentIntentResponse createPaymentIntent(PaymentIntentRequest request) {
        String intentId = "pi_sim_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        String clientSecret = intentId + "_secret_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        
        BigDecimal amt = request.getAmount() != null ? request.getAmount() : BigDecimal.ZERO;
        String upiQr = String.format("upi://pay?pa=championsclub@icici&pn=ChampionsClub&am=%.2f&cu=INR&tr=%s", amt, intentId);

        return PaymentIntentResponse.builder()
                .intentId(intentId)
                .clientSecret(clientSecret)
                .amount(amt)
                .currency(request.getCurrency() != null ? request.getCurrency() : "INR")
                .status("REQUIRES_PAYMENT_METHOD")
                .upiQrString(upiQr)
                .paymentId(request.getPaymentId())
                .build();
    }

    @Override
    public GatewayProcessResult processPayment(GatewayProcessRequest request) {
        log.info("SimulatedGateway processing payment: amount={}, method={}", request.amount(), request.method());

        // 1. Check amount fail trigger: ending in .99
        if (request.amount() != null) {
            BigDecimal cents = request.amount().remainder(BigDecimal.ONE);
            if (cents.compareTo(new BigDecimal("0.99")) == 0) {
                log.warn("Deterministic fail trigger hit: amount ends with .99");
                return new GatewayProcessResult(false, null, "FAILED", "INSUFFICIENT_FUNDS_SIMULATED");
            }
        }

        // 2. Check Card fail triggers
        if ("CARD".equalsIgnoreCase(request.method())) {
            String card = request.cardNumber();
            if (card != null) {
                String clean = card.replaceAll("\\s+", "");
                if (clean.endsWith("0002")) {
                    return new GatewayProcessResult(false, null, "FAILED", "CARD_DECLINED_BY_ISSUER");
                }
                if (clean.endsWith("0003")) {
                    return new GatewayProcessResult(false, null, "FAILED", "EXPIRED_CARD");
                }
                if (clean.endsWith("0004")) {
                    String ref = "sim_to_" + UUID.randomUUID().toString().substring(0, 8);
                    return new GatewayProcessResult(false, ref, "PENDING", "GATEWAY_TIMEOUT_SIMULATED");
                }
            }
        }

        // 3. Check UPI fail triggers
        if ("UPI".equalsIgnoreCase(request.method())) {
            String vpa = request.upiVpa();
            if (vpa != null) {
                if ("fail@upi".equalsIgnoreCase(vpa.trim())) {
                    return new GatewayProcessResult(false, null, "FAILED", "UPI_USER_DECLINED");
                }
                if ("timeout@upi".equalsIgnoreCase(vpa.trim())) {
                    String ref = "sim_to_" + UUID.randomUUID().toString().substring(0, 8);
                    return new GatewayProcessResult(false, ref, "PENDING", "UPI_TIMEOUT");
                }
            }
        }

        // 4. Default Success
        String providerRef = "sim_pay_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        return new GatewayProcessResult(true, providerRef, "SUCCEEDED", null);
    }

    @Override
    public GatewayRefundResult processRefund(GatewayRefundRequest request) {
        log.info("SimulatedGateway processing refund: amount={}, ref={}", request.refundAmount(), request.providerRef());

        if (request.providerRef() != null && request.providerRef().contains("fail_refund")) {
            return new GatewayRefundResult(false, null, "GATEWAY_REFUND_REJECTED");
        }

        String refId = "sim_ref_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        return new GatewayRefundResult(true, refId, null);
    }

    @Override
    public boolean verifyWebhookSignature(String rawPayload, String signature, String secret) {
        if (signature == null || signature.isBlank() || rawPayload == null) {
            return false;
        }
        try {
            String expected = generateSignature(rawPayload, secret != null ? secret : this.webhookSecret);
            return MessageDigest.isEqual(
                    expected.getBytes(StandardCharsets.UTF_8),
                    signature.trim().getBytes(StandardCharsets.UTF_8)
            );
        } catch (Exception e) {
            log.error("Signature verification exception: {}", e.getMessage());
            return false;
        }
    }

    public String generateSignature(String payload, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(
                    secret.getBytes(StandardCharsets.UTF_8),
                    "HmacSHA256"
            );
            mac.init(secretKeySpec);
            byte[] hmacBytes = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hmacBytes);
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate HMAC SHA256 signature", e);
        }
    }

    @Override
    public GatewayStatusResult queryPaymentStatus(String providerRef) {
        if (providerRef == null) {
            return new GatewayStatusResult("FAILED", null, BigDecimal.ZERO, "INVALID_PROVIDER_REF");
        }
        if (providerRef.startsWith("sim_to_")) {
            // Reconcile simulated timeout to SUCCEEDED
            return new GatewayStatusResult("SUCCEEDED", providerRef, null, null);
        }
        return new GatewayStatusResult("SUCCEEDED", providerRef, null, null);
    }
}
