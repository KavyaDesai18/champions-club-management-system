package com.championsclub.billing.api;

import com.championsclub.billing.dto.*;
import com.championsclub.billing.gateway.SimulatedGateway;
import com.championsclub.billing.service.PaymentService;
import com.championsclub.member.domain.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/payments", "/api/payments"})
@RequiredArgsConstructor
@Tag(name = "Payments", description = "Payment processing, split payments, refunds, and gateway intents")
public class PaymentController {

    private final PaymentService paymentService;
    private final SimulatedGateway simulatedGateway;

    @PostMapping
    @Operation(summary = "Process a single payment transaction")
    public ResponseEntity<PaymentResponse> processPayment(
            @Valid @RequestBody PaymentRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            org.springframework.security.core.Authentication authentication
    ) {
        User currentUser = extractUser(authentication);
        PaymentResponse response = paymentService.processPayment(request, idempotencyKey, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/split")
    @Operation(summary = "Process a split payment across multiple tender methods")
    public ResponseEntity<List<PaymentResponse>> processSplitPayment(
            @Valid @RequestBody SplitPaymentRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            org.springframework.security.core.Authentication authentication
    ) {
        User currentUser = extractUser(authentication);
        List<PaymentResponse> responses = paymentService.processSplitPayment(request, idempotencyKey, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(responses);
    }

    @PostMapping("/intent")
    @Operation(summary = "Create a payment intent or simulated UPI QR code")
    public ResponseEntity<PaymentIntentResponse> createPaymentIntent(
            @Valid @RequestBody PaymentIntentRequest request
    ) {
        PaymentIntentResponse response = simulatedGateway.createPaymentIntent(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refund")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'FRONT_DESK')")
    @Operation(summary = "Process a full or partial refund for a payment")
    public ResponseEntity<RefundResponse> processRefund(
            @Valid @RequestBody RefundRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            org.springframework.security.core.Authentication authentication
    ) {
        User currentUser = extractUser(authentication);
        RefundResponse response = paymentService.processRefund(request, idempotencyKey, currentUser);
        return ResponseEntity.ok(response);
    }

    private User extractUser(org.springframework.security.core.Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return user;
        }
        return null;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'FRONT_DESK')")
    @Operation(summary = "List all payments")
    public ResponseEntity<Page<PaymentResponse>> getAllPayments(
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(paymentService.getAllPayments(pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get payment details by ID")
    public ResponseEntity<PaymentResponse> getPaymentById(@PathVariable UUID id) {
        return ResponseEntity.ok(paymentService.getPaymentById(id));
    }
}
