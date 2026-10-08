package com.championsclub.billing.service;

import com.championsclub.billing.domain.*;
import com.championsclub.billing.repo.LedgerEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class LedgerService {

    private final LedgerEntryRepository ledgerEntryRepository;

    /**
     * Records a balanced double-entry transaction.
     * Invariant: Total Debits MUST strictly equal Total Credits.
     */
    @Transactional
    public List<LedgerEntry> recordTransaction(UUID transactionId, List<LedgerEntry> entries) {
        if (entries == null || entries.isEmpty()) {
            throw new IllegalArgumentException("Ledger transaction must contain at least two entries");
        }

        BigDecimal totalDebits = BigDecimal.ZERO;
        BigDecimal totalCredits = BigDecimal.ZERO;

        for (LedgerEntry entry : entries) {
            if (entry.getAmount() == null || entry.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Ledger entry amount must be positive. Given: " + entry.getAmount());
            }
            entry.setTransactionId(transactionId);
            if (entry.getEntryType() == LedgerEntryType.DEBIT) {
                totalDebits = totalDebits.add(entry.getAmount());
            } else if (entry.getEntryType() == LedgerEntryType.CREDIT) {
                totalCredits = totalCredits.add(entry.getAmount());
            }
        }

        totalDebits = totalDebits.setScale(2, RoundingMode.HALF_UP);
        totalCredits = totalCredits.setScale(2, RoundingMode.HALF_UP);

        if (totalDebits.compareTo(totalCredits) != 0) {
            log.error("LEDGER INVARIANT VIOLATION: Debits {} != Credits {} for transaction {}", totalDebits, totalCredits, transactionId);
            throw new IllegalStateException(String.format("Double-entry invariant violated: debits (%s) != credits (%s)", totalDebits, totalCredits));
        }

        return ledgerEntryRepository.saveAll(entries);
    }

    /**
     * Creates standard balanced double-entry entries for a completed payment.
     */
    @Transactional
    public List<LedgerEntry> recordPayment(Payment payment, BigDecimal taxAmount) {
        UUID txId = UUID.randomUUID();
        BigDecimal totalAmount = payment.getAmount().setScale(2, RoundingMode.HALF_UP);
        if (totalAmount.compareTo(BigDecimal.ZERO) <= 0) {
            // Free plan / zero amount: record zero-impact or skip ledger
            return List.of();
        }

        BigDecimal tax = (taxAmount != null ? taxAmount : BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
        if (tax.compareTo(totalAmount) > 0) {
            tax = BigDecimal.ZERO;
        }
        BigDecimal netRevenue = totalAmount.subtract(tax).setScale(2, RoundingMode.HALF_UP);

        // 1. DEBIT side: Payment method receiving asset / receivable
        LedgerAccount debitAccount = switch (payment.getMethod()) {
            case CASH -> LedgerAccount.CASH;
            case CARD -> LedgerAccount.CARD;
            case UPI -> LedgerAccount.UPI;
            case WALLET -> LedgerAccount.WALLET;
            case BILL_TO_ACCOUNT, CREDIT -> LedgerAccount.ACCOUNTS_RECEIVABLE;
        };

        // 2. CREDIT side: Revenue account based on source
        LedgerAccount creditRevenueAccount = switch (payment.getSourceType()) {
            case BOOKING -> LedgerAccount.COURT_REVENUE;
            case ORDER -> LedgerAccount.SHOP_REVENUE;
            case TAB -> LedgerAccount.BAR_REVENUE;
            case MEMBERSHIP -> LedgerAccount.MEMBERSHIP_REVENUE;
            case SOCIAL -> LedgerAccount.COURT_REVENUE;
            case INVOICE -> LedgerAccount.ACCOUNTS_RECEIVABLE; // Settling receivable with cash/bank
            case ADJUSTMENT -> LedgerAccount.COURT_REVENUE;
        };

        List<LedgerEntry> entries = new ArrayList<>();

        // DEBIT Asset / Receivable
        entries.add(LedgerEntry.builder()
                .transactionId(txId)
                .payment(payment)
                .account(debitAccount)
                .entryType(LedgerEntryType.DEBIT)
                .amount(totalAmount)
                .sourceType(payment.getSourceType())
                .sourceId(payment.getSourceId())
                .description("Payment received via " + payment.getMethod())
                .build());

        // CREDIT Revenue
        entries.add(LedgerEntry.builder()
                .transactionId(txId)
                .payment(payment)
                .account(creditRevenueAccount)
                .entryType(LedgerEntryType.CREDIT)
                .amount(netRevenue)
                .sourceType(payment.getSourceType())
                .sourceId(payment.getSourceId())
                .description("Revenue recognized from " + payment.getSourceType())
                .build());

        // CREDIT Tax Payable if applicable
        if (tax.compareTo(BigDecimal.ZERO) > 0) {
            entries.add(LedgerEntry.builder()
                    .transactionId(txId)
                    .payment(payment)
                    .account(LedgerAccount.TAX_PAYABLE)
                    .entryType(LedgerEntryType.CREDIT)
                    .amount(tax)
                    .sourceType(payment.getSourceType())
                    .sourceId(payment.getSourceId())
                    .description("GST Tax payable collected")
                    .build());
        }

        return recordTransaction(txId, entries);
    }

    /**
     * Creates standard balanced double-entry entries for a refund.
     */
    @Transactional
    public List<LedgerEntry> recordRefund(Refund refund, Payment payment) {
        UUID txId = UUID.randomUUID();
        BigDecimal amount = refund.getAmount().setScale(2, RoundingMode.HALF_UP);

        LedgerAccount creditAccount = switch (payment.getMethod()) {
            case CASH -> LedgerAccount.CASH;
            case CARD -> LedgerAccount.CARD;
            case UPI -> LedgerAccount.UPI;
            case WALLET -> LedgerAccount.WALLET;
            case BILL_TO_ACCOUNT, CREDIT -> LedgerAccount.ACCOUNTS_RECEIVABLE;
        };

        List<LedgerEntry> entries = List.of(
                LedgerEntry.builder()
                        .transactionId(txId)
                        .refund(refund)
                        .payment(payment)
                        .account(LedgerAccount.REFUNDS)
                        .entryType(LedgerEntryType.DEBIT)
                        .amount(amount)
                        .sourceType(payment.getSourceType())
                        .sourceId(payment.getSourceId())
                        .description("Refund processed: " + refund.getReason())
                        .build(),
                LedgerEntry.builder()
                        .transactionId(txId)
                        .refund(refund)
                        .payment(payment)
                        .account(creditAccount)
                        .entryType(LedgerEntryType.CREDIT)
                        .amount(amount)
                        .sourceType(payment.getSourceType())
                        .sourceId(payment.getSourceId())
                        .description("Cash/Bank outflow for refund via " + payment.getMethod())
                        .build()
        );

        return recordTransaction(txId, entries);
    }
}
