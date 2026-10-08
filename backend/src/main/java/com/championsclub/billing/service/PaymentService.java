package com.championsclub.billing.service;

import com.championsclub.billing.domain.*;
import com.championsclub.billing.dto.*;
import com.championsclub.billing.gateway.PaymentProvider;
import com.championsclub.billing.gateway.SimulatedGateway;
import com.championsclub.billing.repo.CorporateAccountRepository;
import com.championsclub.billing.repo.InvoiceRepository;
import com.championsclub.billing.repo.PaymentRepository;
import com.championsclub.billing.repo.RefundRepository;
import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.member.domain.Member;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.MemberRepository;
import com.championsclub.member.repo.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final RefundRepository refundRepository;
    private final MemberRepository memberRepository;
    private final UserRepository userRepository;
    private final CorporateAccountRepository corporateAccountRepository;
    private final InvoiceRepository invoiceRepository;
    private final LedgerService ledgerService;
    private final CashDrawerService cashDrawerService;
    private final CorporateAccountService corporateAccountService;
    private final InvoiceService invoiceService;
    private final SimulatedGateway simulatedGateway;

    @Transactional
    public PaymentResponse processPayment(PaymentRequest req, String idempotencyKey, User currentUser) {
        // 1. Idempotency Guard
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<Payment> existing = paymentRepository.findByIdempotencyKey(idempotencyKey.trim());
            if (existing.isPresent()) {
                log.info("Idempotent hit for payment key: {}", idempotencyKey);
                return mapToResponse(existing.get());
            }
        }

        // 2. Validate Amount
        if (req.getAmount() == null || req.getAmount().compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessValidationException("Payment amount cannot be negative", "INVALID_AMOUNT");
        }

        BigDecimal amount = req.getAmount().setScale(2, RoundingMode.HALF_UP);

        // Resolve Payer & Member
        Member member = null;
        if (req.getMemberId() != null) {
            member = memberRepository.findByIdAndIsDeletedFalse(req.getMemberId()).orElse(null);
        }

        User payerUser = null;
        if (req.getPayerUserId() != null) {
            payerUser = userRepository.findById(req.getPayerUserId()).orElse(null);
        } else if (member != null && member.getUser() != null) {
            payerUser = member.getUser();
        }

        CorporateAccount corporateAccount = null;
        if (req.getCorporateAccountId() != null) {
            corporateAccount = corporateAccountRepository.findById(req.getCorporateAccountId()).orElse(null);
        } else if (member != null && member.getCorporateAccount() != null) {
            corporateAccount = member.getCorporateAccount();
        }

        String payerName = req.getPayerName() != null ? req.getPayerName() : (member != null ? member.getFullName() : (payerUser != null ? payerUser.getFullName() : "Walk-in Guest"));
        String payerEmail = req.getPayerEmail() != null ? req.getPayerEmail() : (member != null ? member.getEmail() : (payerUser != null ? payerUser.getEmail() : null));
        String payerPhone = req.getPayerPhone() != null ? req.getPayerPhone() : (member != null ? member.getPhone() : (payerUser != null ? payerUser.getPhone() : null));

        // 3. Zero-Amount payment (e.g. Free Tier Booking / Benefit)
        if (amount.compareTo(BigDecimal.ZERO) == 0) {
            Payment zeroPayment = Payment.builder()
                    .payerUser(payerUser)
                    .member(member)
                    .corporateAccount(corporateAccount)
                    .payerName(payerName)
                    .payerEmail(payerEmail)
                    .payerPhone(payerPhone)
                    .sourceType(req.getSourceType())
                    .sourceId(req.getSourceId())
                    .method(req.getMethod())
                    .amount(BigDecimal.ZERO)
                    .currency(req.getCurrency() != null ? req.getCurrency() : "INR")
                    .status(PaymentStatus.SUCCEEDED)
                    .providerRef("zero_comp_" + UUID.randomUUID().toString().substring(0, 8))
                    .idempotencyKey(idempotencyKey != null ? idempotencyKey.trim() : null)
                    .createdBy(currentUser)
                    .build();

            Payment saved = paymentRepository.save(zeroPayment);
            Invoice invoice = invoiceService.createInvoiceForPayment(saved, req.getSourceType() + " complimentary charge", BigDecimal.ZERO, currentUser);
            PaymentResponse resp = mapToResponse(saved);
            resp.setInvoiceNumber(invoice.getInvoiceNumber());
            resp.setInvoiceId(invoice.getId());
            return resp;
        }

        // 4. Method-specific Execution
        Payment payment = Payment.builder()
                .payerUser(payerUser)
                .member(member)
                .corporateAccount(corporateAccount)
                .payerName(payerName)
                .payerEmail(payerEmail)
                .payerPhone(payerPhone)
                .sourceType(req.getSourceType())
                .sourceId(req.getSourceId())
                .method(req.getMethod())
                .amount(amount)
                .currency(req.getCurrency() != null ? req.getCurrency() : "INR")
                .status(PaymentStatus.PENDING)
                .idempotencyKey(idempotencyKey != null ? idempotencyKey.trim() : null)
                .cashDrawerSessionId(req.getCashDrawerSessionId())
                .createdBy(currentUser)
                .build();

        switch (req.getMethod()) {
            case CASH -> {
                CashDrawerSession drawerSession = null;
                if (req.getCashDrawerSessionId() != null) {
                    drawerSession = cashDrawerService.getSessionDetails(req.getCashDrawerSessionId()) != null
                            ? cashDrawerService.getActiveSessionForStaff(currentUser != null ? currentUser.getId() : null).orElse(null)
                            : null;
                }
                if (drawerSession == null && currentUser != null) {
                    drawerSession = cashDrawerService.getActiveSessionForStaff(currentUser.getId()).orElse(null);
                }
                if (drawerSession == null) {
                    throw new BusinessValidationException("Staff must have an open cash drawer to accept cash payments", "DRAWER_NOT_OPEN");
                }
                payment.setCashDrawerSessionId(drawerSession.getId());
                payment.setStatus(PaymentStatus.SUCCEEDED);
                payment.setProviderRef("cash_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10));
                payment = paymentRepository.save(payment);
                cashDrawerService.recordCashPayment(drawerSession, payment, currentUser);
            }
            case CARD, UPI -> {
                PaymentProvider.GatewayProcessRequest gReq = new PaymentProvider.GatewayProcessRequest(
                        null,
                        amount,
                        payment.getCurrency(),
                        req.getMethod().name(),
                        req.getCardNumber(),
                        req.getCardExpiry(),
                        req.getCardCvv(),
                        req.getCardToken(),
                        req.getUpiVpa(),
                        idempotencyKey
                );
                PaymentProvider.GatewayProcessResult gRes = simulatedGateway.processPayment(gReq);
                if (gRes.successful()) {
                    payment.setStatus(PaymentStatus.SUCCEEDED);
                    payment.setProviderRef(gRes.providerRef());
                    payment = paymentRepository.save(payment);
                } else if ("PENDING".equalsIgnoreCase(gRes.status())) {
                    payment.setStatus(PaymentStatus.PENDING);
                    payment.setProviderRef(gRes.providerRef());
                    payment.setFailureReason(gRes.failureReason());
                    payment = paymentRepository.save(payment);
                    throw new BusinessValidationException("Gateway response pending reconciliation: " + gRes.failureReason(), "PAYMENT_PENDING");
                } else {
                    payment.setStatus(PaymentStatus.FAILED);
                    payment.setFailureReason(gRes.failureReason());
                    paymentRepository.save(payment);
                    throw new BusinessValidationException("Payment rejected: " + gRes.failureReason(), "PAYMENT_FAILED");
                }
            }
            case WALLET -> {
                if (member == null) {
                    throw new BusinessValidationException("A registered member is required for wallet payments", "MEMBER_REQUIRED");
                }
                if (member.getWalletBalance().compareTo(amount) < 0) {
                    throw new BusinessValidationException(
                            String.format("Insufficient wallet balance. Available: ₹%s, Required: ₹%s", member.getWalletBalance(), amount),
                            "INSUFFICIENT_WALLET_BALANCE"
                    );
                }
                member.setWalletBalance(member.getWalletBalance().subtract(amount));
                memberRepository.save(member);
                payment.setStatus(PaymentStatus.SUCCEEDED);
                payment.setProviderRef("wallet_" + UUID.randomUUID().toString().substring(0, 10));
                payment = paymentRepository.save(payment);
            }
            case BILL_TO_ACCOUNT -> {
                if (corporateAccount == null) {
                    throw new BusinessValidationException("Corporate account is required for Bill-To-Account payment", "CORPORATE_ACCOUNT_REQUIRED");
                }
                if (member != null && !Boolean.TRUE.equals(member.getCanChargeToCompany())) {
                    throw new BusinessValidationException("Member is not authorized to charge corporate account", "CORPORATE_CHARGE_UNAUTHORIZED");
                }
                corporateAccountService.validateAndChargeCredit(corporateAccount.getId(), amount, req.isManagerOverride());
                payment.setStatus(PaymentStatus.SUCCEEDED);
                payment.setCorporateAccount(corporateAccount);
                payment.setProviderRef("corp_" + corporateAccount.getId().toString().substring(0, 8));
                payment = paymentRepository.save(payment);
            }
            case CREDIT -> {
                payment.setStatus(PaymentStatus.SUCCEEDED);
                payment.setProviderRef("credit_" + UUID.randomUUID().toString().substring(0, 10));
                payment = paymentRepository.save(payment);
            }
        }

        // 5. Post-Payment: Balanced Double-Entry Ledger & Tax Invoice
        BigDecimal taxRate = new BigDecimal("18.00");
        BigDecimal divisor = BigDecimal.ONE.add(taxRate.divide(new BigDecimal("100.00"), 4, RoundingMode.HALF_UP));
        BigDecimal subtotal = amount.divide(divisor, 2, RoundingMode.HALF_UP);
        BigDecimal taxAmount = amount.subtract(subtotal);

        ledgerService.recordPayment(payment, taxAmount);
        Invoice invoice = invoiceService.createInvoiceForPayment(payment, req.getSourceType() + " charge (" + req.getMethod() + ")", taxRate, currentUser);

        PaymentResponse resp = mapToResponse(payment);
        resp.setInvoiceNumber(invoice.getInvoiceNumber());
        resp.setInvoiceId(invoice.getId());
        return resp;
    }

    @Transactional
    public List<PaymentResponse> processSplitPayment(SplitPaymentRequest req, String idempotencyKey, User currentUser) {
        BigDecimal sum = BigDecimal.ZERO;
        for (SplitItemDto split : req.getSplits()) {
            sum = sum.add(split.getAmount());
        }

        sum = sum.setScale(2, RoundingMode.HALF_UP);
        BigDecimal expectedTotal = req.getTotalAmount().setScale(2, RoundingMode.HALF_UP);

        if (sum.compareTo(expectedTotal) != 0) {
            throw new BusinessValidationException(
                    String.format("Sum of split payments (₹%s) does not match total amount (₹%s)", sum, expectedTotal),
                    "SPLIT_AMOUNT_MISMATCH"
            );
        }

        UUID splitGroupId = UUID.randomUUID();
        List<PaymentResponse> responses = new ArrayList<>();

        int idx = 0;
        for (SplitItemDto split : req.getSplits()) {
            String splitKey = (idempotencyKey != null ? idempotencyKey + "_split_" + idx : null);
            PaymentRequest pReq = PaymentRequest.builder()
                    .payerUserId(req.getPayerUserId())
                    .memberId(req.getMemberId())
                    .corporateAccountId(req.getCorporateAccountId())
                    .payerName(req.getPayerName())
                    .payerEmail(req.getPayerEmail())
                    .payerPhone(req.getPayerPhone())
                    .sourceType(req.getSourceType())
                    .sourceId(req.getSourceId())
                    .method(split.getMethod())
                    .amount(split.getAmount())
                    .cardToken(split.getCardToken())
                    .cardNumber(split.getCardNumber())
                    .upiVpa(split.getUpiVpa())
                    .cashDrawerSessionId(req.getCashDrawerSessionId())
                    .managerOverride(req.isManagerOverride())
                    .notes(split.getNotes())
                    .build();

            PaymentResponse res = processPayment(pReq, splitKey, currentUser);
            res.setSplitGroupId(splitGroupId);

            // Link split group ID
            Payment p = paymentRepository.findById(res.getId()).orElse(null);
            if (p != null) {
                p.setSplitGroupId(splitGroupId);
                paymentRepository.save(p);
            }

            responses.add(res);
            idx++;
        }

        return responses;
    }

    @Transactional
    public RefundResponse processRefund(RefundRequest req, String idempotencyKey, User currentUser) {
        Payment payment = paymentRepository.findByIdWithLock(req.getPaymentId())
                .orElseThrow(() -> new ResourceNotFoundException("Payment", req.getPaymentId()));

        if (payment.getStatus() != PaymentStatus.SUCCEEDED && payment.getStatus() != PaymentStatus.PARTIAL_REFUND) {
            throw new BusinessValidationException("Cannot refund payment in status: " + payment.getStatus(), "INVALID_PAYMENT_STATUS");
        }

        BigDecimal refundAmt = req.getAmount().setScale(2, RoundingMode.HALF_UP);
        if (refundAmt.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessValidationException("Refund amount must be positive", "INVALID_REFUND_AMOUNT");
        }

        BigDecimal alreadyRefunded = refundRepository.getTotalRefundedForPayment(payment.getId());
        BigDecimal remainingRefundable = payment.getAmount().subtract(alreadyRefunded);

        if (refundAmt.compareTo(remainingRefundable) > 0) {
            throw new BusinessValidationException(
                    String.format("Refund amount (₹%s) exceeds remaining refundable balance (₹%s). Original paid: ₹%s, already refunded: ₹%s",
                            refundAmt, remainingRefundable, payment.getAmount(), alreadyRefunded),
                    "REFUND_EXCEEDS_PAID"
            );
        }

        // Method-specific reversal
        String providerRefundId = null;
        switch (payment.getMethod()) {
            case CASH -> {
                CashDrawerSession drawer = null;
                if (req.getCashDrawerSessionId() != null) {
                    drawer = cashDrawerService.getSessionDetails(req.getCashDrawerSessionId()) != null
                            ? cashDrawerService.getActiveSessionForStaff(currentUser != null ? currentUser.getId() : null).orElse(null)
                            : null;
                }
                if (drawer == null && currentUser != null) {
                    drawer = cashDrawerService.getActiveSessionForStaff(currentUser.getId()).orElse(null);
                }
                if (drawer != null) {
                    Refund dummyRefund = Refund.builder().amount(refundAmt).reason(req.getReason()).build();
                    cashDrawerService.recordCashRefund(drawer, dummyRefund, currentUser);
                }
            }
            case WALLET -> {
                if (payment.getMember() != null) {
                    Member m = payment.getMember();
                    m.setWalletBalance(m.getWalletBalance().add(refundAmt));
                    memberRepository.save(m);
                }
            }
            case BILL_TO_ACCOUNT -> {
                if (payment.getCorporateAccount() != null) {
                    corporateAccountService.releaseCredit(payment.getCorporateAccount().getId(), refundAmt);
                }
            }
            case CARD, UPI -> {
                PaymentProvider.GatewayRefundRequest rReq = new PaymentProvider.GatewayRefundRequest(
                        payment.getId().toString(),
                        payment.getProviderRef(),
                        refundAmt,
                        payment.getCurrency(),
                        req.getReason()
                );
                PaymentProvider.GatewayRefundResult rRes = simulatedGateway.processRefund(rReq);
                if (rRes.successful()) {
                    providerRefundId = rRes.providerRefundId();
                } else {
                    throw new BusinessValidationException("Gateway refund failed: " + rRes.failureReason(), "GATEWAY_REFUND_FAILED");
                }
            }
            case CREDIT -> {
                // Credit memo handled
            }
        }

        String refundRef = "REF-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();

        Refund refund = Refund.builder()
                .payment(payment)
                .amount(refundAmt)
                .reason(req.getReason())
                .refundRef(refundRef)
                .status(RefundStatus.SUCCEEDED)
                .providerRefundId(providerRefundId)
                .cashDrawerSessionId(req.getCashDrawerSessionId())
                .createdBy(currentUser)
                .build();
        Refund savedRefund = refundRepository.save(refund);

        // Update payment status
        BigDecimal newTotalRefunded = alreadyRefunded.add(refundAmt);
        if (newTotalRefunded.compareTo(payment.getAmount()) >= 0) {
            payment.setStatus(PaymentStatus.REFUNDED);
        } else {
            payment.setStatus(PaymentStatus.PARTIAL_REFUND);
        }
        paymentRepository.save(payment);

        // Record balanced double-entry ledger entries for refund
        ledgerService.recordRefund(savedRefund, payment);

        // Find invoice to issue Credit Note
        List<Invoice> invoices = invoiceRepository.findByPaymentId(payment.getId());
        CreditNote creditNote = null;
        if (!invoices.isEmpty()) {
            creditNote = invoiceService.issueCreditNote(invoices.get(0).getId(), refundAmt, req.getReason(), savedRefund, currentUser);
        }

        return RefundResponse.builder()
                .id(savedRefund.getId())
                .paymentId(payment.getId())
                .amount(savedRefund.getAmount())
                .reason(savedRefund.getReason())
                .refundRef(savedRefund.getRefundRef())
                .status(savedRefund.getStatus())
                .creditNoteNumber(creditNote != null ? creditNote.getCreditNoteNumber() : null)
                .creditNoteId(creditNote != null ? creditNote.getId() : null)
                .createdAt(savedRefund.getCreatedAt())
                .build();
    }

    @Transactional
    public void handleWebhook(String rawPayload, String signature, WebhookPayload payload) {
        // 1. Signature Verification
        if (!simulatedGateway.verifyWebhookSignature(rawPayload, signature, null)) {
            log.error("Rejected payment webhook with invalid signature: {}", signature);
            throw new AccessDeniedException("Invalid webhook signature");
        }

        log.info("Processing verified payment webhook: eventId={}, type={}", payload.getEventId(), payload.getEventType());

        if (payload.getPaymentId() == null) {
            return;
        }

        UUID paymentId;
        try {
            paymentId = UUID.fromString(payload.getPaymentId());
        } catch (IllegalArgumentException e) {
            log.warn("Invalid paymentId in webhook: {}", payload.getPaymentId());
            return;
        }

        Optional<Payment> paymentOpt = paymentRepository.findById(paymentId);
        if (paymentOpt.isEmpty()) {
            log.warn("Webhook received for unknown payment: {}", paymentId);
            return;
        }

        Payment payment = paymentOpt.get();

        // 2. Out of order / duplicate check
        if (payment.getStatus() == PaymentStatus.SUCCEEDED && "payment.succeeded".equalsIgnoreCase(payload.getEventType())) {
            log.info("Payment {} already marked SUCCEEDED. Idempotent webhook ignored.", paymentId);
            return;
        }

        if (payment.getStatus() == PaymentStatus.FAILED && "payment.failed".equalsIgnoreCase(payload.getEventType())) {
            log.info("Payment {} already marked FAILED. Idempotent webhook ignored.", paymentId);
            return;
        }

        if ("payment.succeeded".equalsIgnoreCase(payload.getEventType()) && payment.getStatus() == PaymentStatus.PENDING) {
            payment.setStatus(PaymentStatus.SUCCEEDED);
            if (payload.getProviderRef() != null) {
                payment.setProviderRef(payload.getProviderRef());
            }
            paymentRepository.save(payment);

            // Record ledger & invoice
            BigDecimal taxRate = new BigDecimal("18.00");
            BigDecimal subtotal = payment.getAmount().divide(new BigDecimal("1.18"), 2, RoundingMode.HALF_UP);
            BigDecimal taxAmount = payment.getAmount().subtract(subtotal);
            ledgerService.recordPayment(payment, taxAmount);
            invoiceService.createInvoiceForPayment(payment, payment.getSourceType() + " charge", taxRate, null);
        } else if ("payment.failed".equalsIgnoreCase(payload.getEventType()) && payment.getStatus() == PaymentStatus.PENDING) {
            payment.setStatus(PaymentStatus.FAILED);
            payment.setFailureReason(payload.getFailureReason());
            paymentRepository.save(payment);
        }
    }

    @Transactional(readOnly = true)
    public Page<PaymentResponse> getAllPayments(Pageable pageable) {
        return paymentRepository.findAllOrdered(pageable).map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public PaymentResponse getPaymentById(UUID id) {
        Payment p = paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payment", id));
        return mapToResponse(p);
    }

    public PaymentResponse mapToResponse(Payment p) {
        List<Invoice> invoices = invoiceRepository.findByPaymentId(p.getId());
        String invNum = !invoices.isEmpty() ? invoices.get(0).getInvoiceNumber() : null;
        UUID invId = !invoices.isEmpty() ? invoices.get(0).getId() : null;

        return PaymentResponse.builder()
                .id(p.getId())
                .payerUserId(p.getPayerUser() != null ? p.getPayerUser().getId() : null)
                .memberId(p.getMember() != null ? p.getMember().getId() : null)
                .corporateAccountId(p.getCorporateAccount() != null ? p.getCorporateAccount().getId() : null)
                .corporateCompanyName(p.getCorporateAccount() != null ? p.getCorporateAccount().getCompanyName() : null)
                .payerName(p.getPayerName())
                .payerEmail(p.getPayerEmail())
                .payerPhone(p.getPayerPhone())
                .sourceType(p.getSourceType())
                .sourceId(p.getSourceId())
                .method(p.getMethod())
                .amount(p.getAmount())
                .currency(p.getCurrency())
                .status(p.getStatus())
                .providerRef(p.getProviderRef())
                .idempotencyKey(p.getIdempotencyKey())
                .splitGroupId(p.getSplitGroupId())
                .cashDrawerSessionId(p.getCashDrawerSessionId())
                .failureReason(p.getFailureReason())
                .invoiceNumber(invNum)
                .invoiceId(invId)
                .createdAt(p.getCreatedAt())
                .build();
    }
}
