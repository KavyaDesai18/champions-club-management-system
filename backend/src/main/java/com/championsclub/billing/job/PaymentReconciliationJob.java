package com.championsclub.billing.job;

import com.championsclub.billing.domain.Payment;
import com.championsclub.billing.domain.PaymentStatus;
import com.championsclub.billing.gateway.PaymentProvider;
import com.championsclub.billing.gateway.SimulatedGateway;
import com.championsclub.billing.repo.PaymentRepository;
import com.championsclub.billing.service.InvoiceService;
import com.championsclub.billing.service.LedgerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class PaymentReconciliationJob {

    private final PaymentRepository paymentRepository;
    private final SimulatedGateway simulatedGateway;
    private final LedgerService ledgerService;
    private final InvoiceService invoiceService;

    @Scheduled(fixedDelay = 60000) // Every minute
    @Transactional
    public void reconcilePendingPayments() {
        Instant cutoff = Instant.now().minus(2, ChronoUnit.MINUTES);
        List<Payment> pendingPayments = paymentRepository.findByStatusAndCreatedAtBefore(PaymentStatus.PENDING, cutoff);

        if (pendingPayments.isEmpty()) {
            return;
        }

        log.info("Running reconciliation on {} pending payments", pendingPayments.size());

        for (Payment payment : pendingPayments) {
            try {
                PaymentProvider.GatewayStatusResult statusResult = simulatedGateway.queryPaymentStatus(payment.getProviderRef());
                if ("SUCCEEDED".equalsIgnoreCase(statusResult.status())) {
                    log.info("Reconciled payment {} to SUCCEEDED", payment.getId());
                    payment.setStatus(PaymentStatus.SUCCEEDED);
                    paymentRepository.save(payment);

                    BigDecimal taxRate = new BigDecimal("18.00");
                    BigDecimal subtotal = payment.getAmount().divide(new BigDecimal("1.18"), 2, RoundingMode.HALF_UP);
                    BigDecimal taxAmount = payment.getAmount().subtract(subtotal);

                    ledgerService.recordPayment(payment, taxAmount);
                    invoiceService.createInvoiceForPayment(payment, payment.getSourceType() + " reconciled payment", taxRate, null);
                } else if ("FAILED".equalsIgnoreCase(statusResult.status())) {
                    log.info("Reconciled payment {} to FAILED: {}", payment.getId(), statusResult.failureReason());
                    payment.setStatus(PaymentStatus.FAILED);
                    payment.setFailureReason(statusResult.failureReason());
                    paymentRepository.save(payment);
                }
            } catch (Exception ex) {
                log.warn("Failed to reconcile payment {}: {}", payment.getId(), ex.getMessage());
            }
        }
    }
}
