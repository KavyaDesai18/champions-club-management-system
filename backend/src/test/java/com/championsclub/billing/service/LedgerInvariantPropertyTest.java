package com.championsclub.billing.service;

import com.championsclub.billing.domain.*;
import com.championsclub.billing.repo.LedgerEntryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LedgerInvariantPropertyTest {

    @Mock
    private LedgerEntryRepository ledgerEntryRepository;

    private LedgerService ledgerService;
    private final Random random = new Random(42);

    @BeforeEach
    void setUp() {
        ledgerService = new LedgerService(ledgerEntryRepository);
        lenient().when(ledgerEntryRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    @DisplayName("Invariant: Rejects any transaction where Debits != Credits")
    void testRejectsUnbalancedTransaction() {
        UUID txId = UUID.randomUUID();
        List<LedgerEntry> unbalanced = List.of(
                LedgerEntry.builder()
                        .account(LedgerAccount.CASH)
                        .entryType(LedgerEntryType.DEBIT)
                        .amount(new BigDecimal("100.00"))
                        .build(),
                LedgerEntry.builder()
                        .account(LedgerAccount.COURT_REVENUE)
                        .entryType(LedgerEntryType.CREDIT)
                        .amount(new BigDecimal("80.00"))
                        .build()
        );

        assertThatThrownBy(() -> ledgerService.recordTransaction(txId, unbalanced))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Double-entry invariant violated");
    }

    @Test
    @DisplayName("Invariant: Standard payment with GST strictly balances debits and credits")
    void testStandardPaymentBalances() {
        Payment payment = Payment.builder()
                .id(UUID.randomUUID())
                .method(PaymentMethod.UPI)
                .sourceType(PaymentSourceType.BOOKING)
                .sourceId(UUID.randomUUID().toString())
                .amount(new BigDecimal("590.00"))
                .build();

        BigDecimal taxAmount = new BigDecimal("90.00");
        List<LedgerEntry> entries = ledgerService.recordPayment(payment, taxAmount);

        BigDecimal debits = entries.stream()
                .filter(e -> e.getEntryType() == LedgerEntryType.DEBIT)
                .map(LedgerEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal credits = entries.stream()
                .filter(e -> e.getEntryType() == LedgerEntryType.CREDIT)
                .map(LedgerEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        assertThat(debits).isEqualByComparingTo(credits);
        assertThat(debits).isEqualByComparingTo(new BigDecimal("590.00"));
    }

    @RepeatedTest(25)
    @DisplayName("Property Test: 100 random multi-leg transactions strictly satisfy debits == credits")
    void testPropertyRandomSequencesBalance() {
        PaymentMethod[] methods = PaymentMethod.values();
        PaymentSourceType[] sources = PaymentSourceType.values();

        for (int i = 0; i < 10; i++) {
            PaymentMethod method = methods[random.nextInt(methods.length)];
            PaymentSourceType source = sources[random.nextInt(sources.length)];

            double randomAmt = 10.0 + (random.nextDouble() * 5000.0);
            BigDecimal amount = BigDecimal.valueOf(randomAmt).setScale(2, RoundingMode.HALF_UP);

            double[] rates = new double[]{0.0, 5.0, 12.0, 18.0, 28.0};
            BigDecimal taxRate = BigDecimal.valueOf(rates[random.nextInt(rates.length)]);
            BigDecimal divisor = BigDecimal.ONE.add(taxRate.divide(new BigDecimal("100.00"), 4, RoundingMode.HALF_UP));
            BigDecimal subtotal = amount.divide(divisor, 2, RoundingMode.HALF_UP);
            BigDecimal tax = amount.subtract(subtotal);

            Payment payment = Payment.builder()
                    .id(UUID.randomUUID())
                    .method(method)
                    .sourceType(source)
                    .sourceId(UUID.randomUUID().toString())
                    .amount(amount)
                    .build();

            List<LedgerEntry> recorded = ledgerService.recordPayment(payment, tax);

            BigDecimal totalDebits = BigDecimal.ZERO;
            BigDecimal totalCredits = BigDecimal.ZERO;

            for (LedgerEntry entry : recorded) {
                if (entry.getEntryType() == LedgerEntryType.DEBIT) {
                    totalDebits = totalDebits.add(entry.getAmount());
                } else {
                    totalCredits = totalCredits.add(entry.getAmount());
                }
            }

            assertThat(totalDebits)
                    .as("Total debits must match total credits for payment " + i)
                    .isEqualByComparingTo(totalCredits);
        }
    }

    @Test
    @DisplayName("Refund ledger entries strictly balance debits and credits")
    void testRefundBalances() {
        Payment payment = Payment.builder()
                .id(UUID.randomUUID())
                .method(PaymentMethod.CARD)
                .sourceType(PaymentSourceType.ORDER)
                .sourceId(UUID.randomUUID().toString())
                .amount(new BigDecimal("250.00"))
                .build();

        Refund refund = Refund.builder()
                .id(UUID.randomUUID())
                .payment(payment)
                .amount(new BigDecimal("100.00"))
                .reason("Customer cancellation")
                .build();

        List<LedgerEntry> entries = ledgerService.recordRefund(refund, payment);

        BigDecimal debits = entries.stream()
                .filter(e -> e.getEntryType() == LedgerEntryType.DEBIT)
                .map(LedgerEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal credits = entries.stream()
                .filter(e -> e.getEntryType() == LedgerEntryType.CREDIT)
                .map(LedgerEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        assertThat(debits).isEqualByComparingTo(credits);
        assertThat(debits).isEqualByComparingTo(new BigDecimal("100.00"));
    }
}
