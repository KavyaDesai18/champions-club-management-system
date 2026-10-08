package com.championsclub.billing.service;

import com.championsclub.billing.domain.CorporateAccount;
import com.championsclub.billing.domain.Invoice;
import com.championsclub.billing.domain.InvoiceStatus;
import com.championsclub.billing.dto.*;
import com.championsclub.billing.repo.CorporateAccountRepository;
import com.championsclub.billing.repo.InvoiceRepository;
import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.member.repo.MemberRepository;
import com.championsclub.member.repo.PlanRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CorporateAccountServiceTest {

    @Mock
    private CorporateAccountRepository corporateAccountRepository;
    @Mock
    private MemberRepository memberRepository;
    @Mock
    private PlanRepository planRepository;
    @Mock
    private InvoiceRepository invoiceRepository;

    private CorporateAccountService corporateAccountService;

    @BeforeEach
    void setUp() {
        corporateAccountService = new CorporateAccountService(
                corporateAccountRepository,
                memberRepository,
                planRepository,
                invoiceRepository
        );
    }

    @Test
    @DisplayName("Validate GSTIN: Valid 15-char Indian GSTIN accepted; invalid rejected")
    void testGstinValidation() {
        // Valid
        corporateAccountService.validateGstin("29ABCDE1234F1Z5");
        corporateAccountService.validateGstin("27AAPFU0939F1ZV");

        // Invalid
        assertThatThrownBy(() -> corporateAccountService.validateGstin("INVALID_GSTIN"))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Invalid GSTIN format");

        assertThatThrownBy(() -> corporateAccountService.validateGstin("29ABCDE1234F1Z")) // 14 chars
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Invalid GSTIN format");
    }

    @Test
    @DisplayName("Corporate Credit Limit: Blocks charge when limit exceeded unless managerOverride is true")
    void testCreditLimitEnforcement() {
        UUID corpId = UUID.randomUUID();
        CorporateAccount account = CorporateAccount.builder()
                .id(corpId)
                .creditLimit(new BigDecimal("1000.00"))
                .usedCredit(new BigDecimal("900.00"))
                .isActive(true)
                .build();

        when(corporateAccountRepository.findByIdWithLock(corpId)).thenReturn(Optional.of(account));

        // 1. Without override: Attempt to charge 200 (900 + 200 = 1100 > 1000) -> Throws
        assertThatThrownBy(() -> corporateAccountService.validateAndChargeCredit(corpId, new BigDecimal("200.00"), false))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Corporate credit limit exceeded");

        // 2. With manager override: Allowed
        corporateAccountService.validateAndChargeCredit(corpId, new BigDecimal("200.00"), true);
        assertThat(account.getUsedCredit()).isEqualByComparingTo(new BigDecimal("1100.00"));
    }

    @Test
    @DisplayName("Aging Report: Accurately classifies invoices into Current, 1-30, 31-60, 61-90, 90+ days overdue")
    void testAgingReportCalculation() {
        UUID corpId = UUID.randomUUID();
        CorporateAccount corp = CorporateAccount.builder()
                .id(corpId)
                .companyName("TechCorp India")
                .gstin("29ABCDE1234F1Z5")
                .paymentTerms("NET_30")
                .creditLimit(new BigDecimal("50000.00"))
                .usedCredit(new BigDecimal("15000.00"))
                .build();

        when(corporateAccountRepository.findAll()).thenReturn(List.of(corp));

        LocalDate today = LocalDate.now();

        List<Invoice> invoices = List.of(
                // Current (due today)
                Invoice.builder().balanceDue(new BigDecimal("1000.00")).dueDate(today).issueDate(today.minusDays(30)).status(InvoiceStatus.SENT).build(),
                // 15 days overdue (due 15 days ago)
                Invoice.builder().balanceDue(new BigDecimal("2000.00")).dueDate(today.minusDays(15)).issueDate(today.minusDays(45)).status(InvoiceStatus.OVERDUE).build(),
                // 45 days overdue
                Invoice.builder().balanceDue(new BigDecimal("3000.00")).dueDate(today.minusDays(45)).issueDate(today.minusDays(75)).status(InvoiceStatus.OVERDUE).build(),
                // 75 days overdue
                Invoice.builder().balanceDue(new BigDecimal("4000.00")).dueDate(today.minusDays(75)).issueDate(today.minusDays(105)).status(InvoiceStatus.OVERDUE).build(),
                // 100 days overdue
                Invoice.builder().balanceDue(new BigDecimal("5000.00")).dueDate(today.minusDays(100)).issueDate(today.minusDays(130)).status(InvoiceStatus.OVERDUE).build()
        );

        when(invoiceRepository.findByCorporateAccountIdAndStatusIn(eq(corpId), any())).thenReturn(invoices);

        AgingReportResponse report = corporateAccountService.getAgingReport();

        assertThat(report.getTotalCurrent()).isEqualByComparingTo(new BigDecimal("1000.00"));
        assertThat(report.getTotalDays1to30()).isEqualByComparingTo(new BigDecimal("2000.00"));
        assertThat(report.getTotalDays31to60()).isEqualByComparingTo(new BigDecimal("3000.00"));
        assertThat(report.getTotalDays61to90()).isEqualByComparingTo(new BigDecimal("4000.00"));
        assertThat(report.getTotalDays90Plus()).isEqualByComparingTo(new BigDecimal("5000.00"));
        assertThat(report.getTotalOutstanding()).isEqualByComparingTo(new BigDecimal("15000.00"));
    }
}
