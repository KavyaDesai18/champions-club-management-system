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
import com.championsclub.member.domain.Member;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.MemberRepository;
import com.championsclub.member.repo.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private PaymentRepository paymentRepository;
    @Mock
    private RefundRepository refundRepository;
    @Mock
    private MemberRepository memberRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private CorporateAccountRepository corporateAccountRepository;
    @Mock
    private InvoiceRepository invoiceRepository;
    @Mock
    private LedgerService ledgerService;
    @Mock
    private CashDrawerService cashDrawerService;
    @Mock
    private CorporateAccountService corporateAccountService;
    @Mock
    private InvoiceService invoiceService;

    private SimulatedGateway simulatedGateway;
    private PaymentService paymentService;

    private User testUser;
    private Member testMember;

    @BeforeEach
    void setUp() {
        simulatedGateway = new SimulatedGateway("test_secret_123");
        paymentService = new PaymentService(
                paymentRepository,
                refundRepository,
                memberRepository,
                userRepository,
                corporateAccountRepository,
                invoiceRepository,
                ledgerService,
                cashDrawerService,
                corporateAccountService,
                invoiceService,
                simulatedGateway
        );

        testUser = User.builder()
                .id(UUID.randomUUID())
                .fullName("John Doe")
                .email("john@example.com")
                .build();

        testMember = Member.builder()
                .id(UUID.randomUUID())
                .fullName("John Doe")
                .email("john@example.com")
                .phone("9876543210")
                .walletBalance(new BigDecimal("500.00"))
                .user(testUser)
                .build();
    }

    @Test
    @DisplayName("Process successful CARD payment via SimulatedGateway")
    void testSuccessfulCardPayment() {
        PaymentRequest req = PaymentRequest.builder()
                .sourceType(PaymentSourceType.BOOKING)
                .sourceId("BK-12345")
                .method(PaymentMethod.CARD)
                .amount(new BigDecimal("120.00"))
                .cardNumber("4000 0000 0000 0001")
                .cardExpiry("12/28")
                .cardCvv("123")
                .payerName("John Doe")
                .build();

        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> {
            Payment p = inv.getArgument(0);
            if (p.getId() == null) p.setId(UUID.randomUUID());
            return p;
        });

        Invoice mockInvoice = Invoice.builder()
                .id(UUID.randomUUID())
                .invoiceNumber("INV-2026-00001")
                .build();
        when(invoiceService.createInvoiceForPayment(any(), any(), any(), any())).thenReturn(mockInvoice);

        PaymentResponse res = paymentService.processPayment(req, "idemp-001", testUser);

        assertThat(res.getStatus()).isEqualTo(PaymentStatus.SUCCEEDED);
        assertThat(res.getAmount()).isEqualByComparingTo(new BigDecimal("120.00"));
        assertThat(res.getProviderRef()).startsWith("sim_pay_");
        assertThat(res.getInvoiceNumber()).isEqualTo("INV-2026-00001");

        verify(ledgerService).recordPayment(any(Payment.class), any());
    }

    @Test
    @DisplayName("Deterministic Fail Trigger: Card ending in 0002 is declined")
    void testDeterministicCardDecline() {
        PaymentRequest req = PaymentRequest.builder()
                .sourceType(PaymentSourceType.BOOKING)
                .sourceId("BK-12345")
                .method(PaymentMethod.CARD)
                .amount(new BigDecimal("120.00"))
                .cardNumber("4000 0000 0000 0002") // Trigger
                .build();

        assertThatThrownBy(() -> paymentService.processPayment(req, "idemp-002", testUser))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("CARD_DECLINED_BY_ISSUER");
    }

    @Test
    @DisplayName("Deterministic Fail Trigger: Amount ending in .99 fails for insufficient funds")
    void testDeterministicAmountFail() {
        PaymentRequest req = PaymentRequest.builder()
                .sourceType(PaymentSourceType.ORDER)
                .sourceId("ORD-999")
                .method(PaymentMethod.UPI)
                .amount(new BigDecimal("49.99")) // Trigger
                .upiVpa("user@okaxis")
                .build();

        assertThatThrownBy(() -> paymentService.processPayment(req, "idemp-003", testUser))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("INSUFFICIENT_FUNDS_SIMULATED");
    }

    @Test
    @DisplayName("Idempotency: Replaying key returns cached payment without re-running gateway")
    void testIdempotencyKeyReuse() {
        Payment existing = Payment.builder()
                .id(UUID.randomUUID())
                .sourceType(PaymentSourceType.BOOKING)
                .sourceId("BK-12345")
                .method(PaymentMethod.CARD)
                .amount(new BigDecimal("100.00"))
                .status(PaymentStatus.SUCCEEDED)
                .idempotencyKey("idemp-unique")
                .providerRef("sim_pay_cached")
                .build();

        when(paymentRepository.findByIdempotencyKey("idemp-unique")).thenReturn(Optional.of(existing));

        PaymentRequest req = PaymentRequest.builder()
                .sourceType(PaymentSourceType.BOOKING)
                .sourceId("BK-12345")
                .method(PaymentMethod.CARD)
                .amount(new BigDecimal("100.00"))
                .build();

        PaymentResponse res = paymentService.processPayment(req, "idemp-unique", testUser);

        assertThat(res.getProviderRef()).isEqualTo("sim_pay_cached");
        verify(paymentRepository, never()).save(any());
        verify(ledgerService, never()).recordPayment(any(), any());
    }

    @Test
    @DisplayName("Free plan booking creates consistent zero-amount payment and invoice")
    void testFreePlanZeroPayment() {
        PaymentRequest req = PaymentRequest.builder()
                .sourceType(PaymentSourceType.BOOKING)
                .sourceId("BK-FREE-01")
                .method(PaymentMethod.WALLET)
                .amount(BigDecimal.ZERO)
                .payerName("Gold Member")
                .build();

        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> {
            Payment p = inv.getArgument(0);
            p.setId(UUID.randomUUID());
            return p;
        });

        Invoice mockInvoice = Invoice.builder()
                .id(UUID.randomUUID())
                .invoiceNumber("INV-2026-FREE-01")
                .build();
        when(invoiceService.createInvoiceForPayment(any(), any(), any(), any())).thenReturn(mockInvoice);

        PaymentResponse res = paymentService.processPayment(req, "free-001", testUser);

        assertThat(res.getStatus()).isEqualTo(PaymentStatus.SUCCEEDED);
        assertThat(res.getAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(res.getProviderRef()).startsWith("zero_comp_");
    }

    @Test
    @DisplayName("Split Payment: Validates split sum matches total and assigns splitGroupId")
    void testSplitPaymentProcessing() {
        SplitPaymentRequest splitReq = SplitPaymentRequest.builder()
                .sourceType(PaymentSourceType.ORDER)
                .sourceId("ORD-SPLIT-1")
                .totalAmount(new BigDecimal("150.00"))
                .splits(List.of(
                        SplitItemDto.builder().method(PaymentMethod.CARD).amount(new BigDecimal("100.00")).cardNumber("4000 0000 0000 0001").build(),
                        SplitItemDto.builder().method(PaymentMethod.UPI).amount(new BigDecimal("50.00")).upiVpa("user@okaxis").build()
                ))
                .build();

        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> {
            Payment p = inv.getArgument(0);
            if (p.getId() == null) p.setId(UUID.randomUUID());
            return p;
        });

        Invoice mockInv = Invoice.builder().id(UUID.randomUUID()).invoiceNumber("INV-SPLIT").build();
        when(invoiceService.createInvoiceForPayment(any(), any(), any(), any())).thenReturn(mockInv);

        List<PaymentResponse> results = paymentService.processSplitPayment(splitReq, "split-idemp", testUser);

        assertThat(results).hasSize(2);
        assertThat(results.get(0).getSplitGroupId()).isNotNull();
        assertThat(results.get(1).getSplitGroupId()).isEqualTo(results.get(0).getSplitGroupId());
        assertThat(results.get(0).getAmount().add(results.get(1).getAmount())).isEqualByComparingTo(new BigDecimal("150.00"));
    }

    @Test
    @DisplayName("Split Payment: Rejects when sum of splits does not match total")
    void testSplitPaymentMismatchRejected() {
        SplitPaymentRequest splitReq = SplitPaymentRequest.builder()
                .sourceType(PaymentSourceType.ORDER)
                .sourceId("ORD-SPLIT-2")
                .totalAmount(new BigDecimal("200.00"))
                .splits(List.of(
                        SplitItemDto.builder().method(PaymentMethod.CARD).amount(new BigDecimal("100.00")).build(),
                        SplitItemDto.builder().method(PaymentMethod.UPI).amount(new BigDecimal("50.00")).build()
                )) // Total 150 != 200
                .build();

        assertThatThrownBy(() -> paymentService.processSplitPayment(splitReq, "mismatch", testUser))
                .isInstanceOf(BusinessValidationException.class)
                .satisfies(t -> assertThat(((BusinessValidationException) t).getCode()).isEqualTo("SPLIT_AMOUNT_MISMATCH"));
    }

    @Test
    @DisplayName("Corporate Account: BILL_TO_ACCOUNT checks credit limit and blocks if exceeded without override")
    void testCorporateCreditLimitEnforcement() {
        UUID corpId = UUID.randomUUID();
        CorporateAccount corp = CorporateAccount.builder()
                .id(corpId)
                .companyName("Acme Corp")
                .creditLimit(new BigDecimal("1000.00"))
                .usedCredit(new BigDecimal("950.00"))
                .isActive(true)
                .build();

        when(corporateAccountRepository.findById(corpId)).thenReturn(Optional.of(corp));
        doThrow(new BusinessValidationException("Corporate credit limit exceeded", "CREDIT_LIMIT_EXCEEDED"))
                .when(corporateAccountService).validateAndChargeCredit(eq(corpId), any(), eq(false));

        PaymentRequest req = PaymentRequest.builder()
                .sourceType(PaymentSourceType.BOOKING)
                .sourceId("BK-CORP-1")
                .method(PaymentMethod.BILL_TO_ACCOUNT)
                .corporateAccountId(corpId)
                .amount(new BigDecimal("100.00"))
                .managerOverride(false)
                .build();

        assertThatThrownBy(() -> paymentService.processPayment(req, "corp-pay-1", testUser))
                .isInstanceOf(BusinessValidationException.class)
                .satisfies(t -> assertThat(((BusinessValidationException) t).getCode()).isEqualTo("CREDIT_LIMIT_EXCEEDED"));
    }

    @Test
    @DisplayName("Refund: Rejects refund if amount exceeds paid amount")
    void testRefundExceedsPaidRejected() {
        UUID payId = UUID.randomUUID();
        Payment payment = Payment.builder()
                .id(payId)
                .amount(new BigDecimal("200.00"))
                .status(PaymentStatus.SUCCEEDED)
                .method(PaymentMethod.CARD)
                .build();

        when(paymentRepository.findByIdWithLock(payId)).thenReturn(Optional.of(payment));
        when(refundRepository.getTotalRefundedForPayment(payId)).thenReturn(new BigDecimal("50.00"));

        RefundRequest req = RefundRequest.builder()
                .paymentId(payId)
                .amount(new BigDecimal("160.00")) // 50 + 160 = 210 > 200
                .reason("Too much refund")
                .build();

        assertThatThrownBy(() -> paymentService.processRefund(req, "ref-over", testUser))
                .isInstanceOf(BusinessValidationException.class)
                .satisfies(t -> assertThat(((BusinessValidationException) t).getCode()).isEqualTo("REFUND_EXCEEDS_PAID"));
    }

    @Test
    @DisplayName("Webhook: Valid signature processes webhook; bad signature throws AccessDeniedException")
    void testWebhookSignatureVerification() {
        String rawBody = "{\"eventId\":\"evt_1\",\"eventType\":\"payment.succeeded\",\"paymentId\":\"" + UUID.randomUUID() + "\",\"amount\":100.00}";
        String validSig = simulatedGateway.generateSignature(rawBody, "test_secret_123");

        WebhookPayload payload = WebhookPayload.builder()
                .eventId("evt_1")
                .eventType("payment.succeeded")
                .paymentId(UUID.randomUUID().toString())
                .amount(new BigDecimal("100.00"))
                .build();

        // 1. Bad signature
        assertThatThrownBy(() -> paymentService.handleWebhook(rawBody, "bad_signature_xyz", payload))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Invalid webhook signature");

        // 2. Good signature
        paymentService.handleWebhook(rawBody, validSig, payload);
    }
}
