package com.championsclub.billing.api;

import com.championsclub.billing.dto.WebhookPayload;
import com.championsclub.billing.service.PaymentService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping({"/api/v1/payments/webhook", "/api/payments/webhook"})
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Payment Webhook", description = "Gateway webhook callback endpoint with HMAC SHA256 signature verification")
public class PaymentWebhookController {

    private final PaymentService paymentService;
    private final ObjectMapper objectMapper;

    @PostMapping
    @Operation(summary = "Handle asynchronous payment gateway webhook callbacks")
    public ResponseEntity<Map<String, Object>> handleWebhook(
            @RequestHeader(value = "X-Signature", required = false) String signature,
            @RequestBody String rawPayload
    ) {
        try {
            WebhookPayload payload = objectMapper.readValue(rawPayload, WebhookPayload.class);
            paymentService.handleWebhook(rawPayload, signature, payload);
            return ResponseEntity.ok(Map.of("status", "received", "eventId", payload.getEventId()));
        } catch (Exception e) {
            log.error("Failed to process payment webhook: {}", e.getMessage());
            throw new RuntimeException(e);
        }
    }
}
