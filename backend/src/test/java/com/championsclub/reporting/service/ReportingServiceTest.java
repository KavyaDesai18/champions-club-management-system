package com.championsclub.reporting.service;

import com.championsclub.bar.domain.Tab;
import com.championsclub.bar.repo.TabRepository;
import com.championsclub.billing.domain.*;
import com.championsclub.billing.repo.InvoiceRepository;
import com.championsclub.billing.repo.PaymentRepository;
import com.championsclub.billing.repo.RefundRepository;
import com.championsclub.court.domain.Booking;
import com.championsclub.court.domain.BookingStatus;
import com.championsclub.court.domain.Court;
import com.championsclub.court.repo.BookingRepository;
import com.championsclub.court.repo.CourtRepository;
import com.championsclub.crm.domain.Lead;
import com.championsclub.crm.domain.LeadStatus;
import com.championsclub.crm.repo.LeadRepository;
import com.championsclub.hr.repo.PayrollRunRepository;
import com.championsclub.member.repo.MemberRepository;
import com.championsclub.reporting.domain.DateRangePreset;
import com.championsclub.reporting.domain.Expense;
import com.championsclub.reporting.domain.ExpenseStatus;
import com.championsclub.reporting.dto.FinancialSummaryDto;
import com.championsclub.reporting.dto.OperationsKpisDto;
import com.championsclub.reporting.dto.StreamRevenueDto;
import com.championsclub.reporting.repo.ExpenseRepository;
import com.championsclub.shop.repo.OrderRepository;
import com.championsclub.shop.repo.ProductVariantRepository;
import com.championsclub.shop.repo.SupplierBillRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportingServiceTest {

    @Mock private PaymentRepository paymentRepository;
    @Mock private RefundRepository refundRepository;
    @Mock private InvoiceRepository invoiceRepository;
    @Mock private ExpenseRepository expenseRepository;
    @Mock private SupplierBillRepository supplierBillRepository;
    @Mock private PayrollRunRepository payrollRunRepository;
    @Mock private MemberRepository memberRepository;
    @Mock private BookingRepository bookingRepository;
    @Mock private CourtRepository courtRepository;
    @Mock private TabRepository tabRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private com.championsclub.shop.repo.LowStockAlertRepository lowStockAlertRepository;
    @Mock private LeadRepository leadRepository;

    private ReportingDateHelper dateHelper;
    private ReportingService reportingService;

    @BeforeEach
    void setUp() {
        dateHelper = new ReportingDateHelper();
        reportingService = new ReportingService(
                dateHelper,
                paymentRepository,
                refundRepository,
                invoiceRepository,
                expenseRepository,
                supplierBillRepository,
                payrollRunRepository,
                memberRepository,
                bookingRepository,
                courtRepository,
                tabRepository,
                orderRepository,
                lowStockAlertRepository,
                leadRepository
        );
    }

    @Test
    @DisplayName("Financial reconciliation: exact seeded scenario where sum of streams equals total revenue equals ledger")
    void testSeededFinancialReconciliation() {
        LocalDate start = LocalDate.of(2026, 10, 1);
        LocalDate end = LocalDate.of(2026, 10, 31);
        Instant now = Instant.parse("2026-10-15T10:00:00Z");

        // Seeded Payments
        Payment p1 = Payment.builder().id(UUID.randomUUID()).amount(new BigDecimal("5000.00")).sourceType(PaymentSourceType.BOOKING).method(PaymentMethod.UPI).createdAt(now).build();
        Payment p2 = Payment.builder().id(UUID.randomUUID()).amount(new BigDecimal("1500.00")).sourceType(PaymentSourceType.SOCIAL).method(PaymentMethod.CASH).createdAt(now).build();
        Payment p3 = Payment.builder().id(UUID.randomUUID()).amount(new BigDecimal("3500.00")).sourceType(PaymentSourceType.ORDER).method(PaymentMethod.CARD).createdAt(now).build();
        Payment p4 = Payment.builder().id(UUID.randomUUID()).amount(new BigDecimal("2000.00")).sourceType(PaymentSourceType.TAB).method(PaymentMethod.UPI).createdAt(now).build();
        Payment p5 = Payment.builder().id(UUID.randomUUID()).amount(new BigDecimal("10000.00")).sourceType(PaymentSourceType.MEMBERSHIP).method(PaymentMethod.CARD).createdAt(now).build();

        when(paymentRepository.findSuccessfulPaymentsBetween(any(), any())).thenReturn(List.of(p1, p2, p3, p4, p5));

        // Seeded Refund
        Refund r1 = Refund.builder().id(UUID.randomUUID()).amount(new BigDecimal("1000.00")).createdAt(now).build();
        when(refundRepository.findSuccessfulRefundsBetween(any(), any())).thenReturn(List.of(r1));

        // Invoices (Voided invoice excluded from active receivables)
        Invoice inv1 = Invoice.builder().invoiceNumber("INV-001").totalAmount(new BigDecimal("5000.00")).paidAmount(new BigDecimal("2000.00")).balanceDue(new BigDecimal("3000.00")).issueDate(start).dueDate(end.plusDays(5)).status(InvoiceStatus.PAID).build();
        Invoice inv2 = Invoice.builder().invoiceNumber("INV-002").totalAmount(new BigDecimal("2000.00")).paidAmount(BigDecimal.ZERO).balanceDue(new BigDecimal("2000.00")).issueDate(start).dueDate(LocalDate.of(2026, 9, 20)).status(InvoiceStatus.OVERDUE).build();

        when(invoiceRepository.findActiveReceivables()).thenReturn(List.of(inv1, inv2));
        when(invoiceRepository.findNonVoidInvoicesBetween(any(), any())).thenReturn(List.of(inv1, inv2));

        // Payables feeds
        when(supplierBillRepository.calculateTotalUnpaidBills()).thenReturn(new BigDecimal("4000.00"));
        when(expenseRepository.sumTotalByStatus(ExpenseStatus.PENDING)).thenReturn(new BigDecimal("3000.00"));
        when(expenseRepository.sumTotalByStatus(ExpenseStatus.PAID)).thenReturn(new BigDecimal("1000.00"));
        when(expenseRepository.sumTaxCreditInDateRange(any(), any())).thenReturn(new BigDecimal("500.00"));
        when(expenseRepository.findOverdueExpenses(any())).thenReturn(Collections.emptyList());
        when(payrollRunRepository.sumUnpaidNetPayroll()).thenReturn(new BigDecimal("6000.00"));
        when(payrollRunRepository.sumPaidNetPayroll()).thenReturn(new BigDecimal("5000.00"));
        when(memberRepository.sumUnsettledWalletBalances()).thenReturn(new BigDecimal("1500.00"));

        FinancialSummaryDto summary = reportingService.getFinancialSummary(DateRangePreset.CUSTOM, start, end);

        // 1. Assert exact stream figures
        BigDecimal courts = summary.getRevenueByStream().stream().filter(s -> s.getStream().equals("COURTS")).map(StreamRevenueDto::getAmount).findFirst().orElse(BigDecimal.ZERO);
        BigDecimal shop = summary.getRevenueByStream().stream().filter(s -> s.getStream().equals("SHOP")).map(StreamRevenueDto::getAmount).findFirst().orElse(BigDecimal.ZERO);
        BigDecimal bar = summary.getRevenueByStream().stream().filter(s -> s.getStream().equals("BAR")).map(StreamRevenueDto::getAmount).findFirst().orElse(BigDecimal.ZERO);
        BigDecimal memberships = summary.getRevenueByStream().stream().filter(s -> s.getStream().equals("MEMBERSHIPS")).map(StreamRevenueDto::getAmount).findFirst().orElse(BigDecimal.ZERO);

        assertThat(courts).isEqualByComparingTo("6500.00");
        assertThat(shop).isEqualByComparingTo("3500.00");
        assertThat(bar).isEqualByComparingTo("2000.00");
        assertThat(memberships).isEqualByComparingTo("10000.00");

        // 2. Reconciliation Invariant: sum of streams strictly equals totalRevenue
        BigDecimal sumOfStreams = courts.add(shop).add(bar).add(memberships);
        assertThat(summary.getTotalRevenue()).isEqualByComparingTo("22000.00");
        assertThat(sumOfStreams).isEqualByComparingTo(summary.getTotalRevenue());

        // 3. Refunds & Net Revenue
        assertThat(summary.getTotalRefunds()).isEqualByComparingTo("1000.00");
        assertThat(summary.getNetRevenue()).isEqualByComparingTo("21000.00");

        // 4. Receivables
        assertThat(summary.getTotalReceivables()).isEqualByComparingTo("5000.00");

        // 5. Payables Breakdown
        assertThat(summary.getPayablesBreakdown().getSupplierBills()).isEqualByComparingTo("4000.00");
        assertThat(summary.getPayablesBreakdown().getExpensesPending()).isEqualByComparingTo("3000.00");
        assertThat(summary.getPayablesBreakdown().getPayrollLiability()).isEqualByComparingTo("6000.00");
        assertThat(summary.getPayablesBreakdown().getUnsettledMemberCredits()).isEqualByComparingTo("1500.00");

        // 6. Net Position Formula: receivables + cash/bank - payables
        // cashAndBank = 22000 (liquid collections) - 1000 (paid expenses) - 5000 (paid payroll) - 1000 (refunds) = 15000
        assertThat(summary.getCashAndBank()).isEqualByComparingTo("15000.00");
        // payables = 4000 + 3000 + 6000 + gstPayable + 0 + 1500
        BigDecimal expectedPayables = summary.getTotalPayables();
        BigDecimal expectedNetPosition = summary.getTotalReceivables().add(summary.getCashAndBank()).subtract(expectedPayables);
        assertThat(summary.getNetPosition()).isEqualByComparingTo(expectedNetPosition);
    }

    @Test
    @DisplayName("Empty range produces valid zero state without NaN or division by zero")
    void testEmptyDataRangeZeroState() {
        LocalDate start = LocalDate.of(2026, 1, 1);
        LocalDate end = LocalDate.of(2026, 1, 31);

        when(paymentRepository.findSuccessfulPaymentsBetween(any(), any())).thenReturn(Collections.emptyList());
        when(refundRepository.findSuccessfulRefundsBetween(any(), any())).thenReturn(Collections.emptyList());
        when(invoiceRepository.findActiveReceivables()).thenReturn(Collections.emptyList());
        when(invoiceRepository.findNonVoidInvoicesBetween(any(), any())).thenReturn(Collections.emptyList());
        when(supplierBillRepository.calculateTotalUnpaidBills()).thenReturn(BigDecimal.ZERO);
        when(expenseRepository.sumTotalByStatus(any())).thenReturn(BigDecimal.ZERO);
        when(expenseRepository.sumTaxCreditInDateRange(any(), any())).thenReturn(BigDecimal.ZERO);
        when(expenseRepository.findOverdueExpenses(any())).thenReturn(Collections.emptyList());
        when(payrollRunRepository.sumUnpaidNetPayroll()).thenReturn(BigDecimal.ZERO);
        when(payrollRunRepository.sumPaidNetPayroll()).thenReturn(BigDecimal.ZERO);
        when(memberRepository.sumUnsettledWalletBalances()).thenReturn(BigDecimal.ZERO);

        FinancialSummaryDto summary = reportingService.getFinancialSummary(DateRangePreset.CUSTOM, start, end);

        assertThat(summary.getTotalRevenue()).isEqualByComparingTo("0.00");
        assertThat(summary.getTotalRefunds()).isEqualByComparingTo("0.00");
        assertThat(summary.getTotalReceivables()).isEqualByComparingTo("0.00");
        assertThat(summary.getTotalPayables()).isEqualByComparingTo("0.00");
        assertThat(summary.getNetPosition()).isEqualByComparingTo("0.00");
        assertThat(summary.getRevenueByStream()).allMatch(s -> s.getPercentage().compareTo(BigDecimal.ZERO) == 0);
    }

    @Test
    @DisplayName("Operations KPIs calculate court utilization, churn, and lead conversion rates safely")
    void testOperationsKpis() {
        LocalDate start = LocalDate.of(2026, 10, 1);
        LocalDate end = LocalDate.of(2026, 10, 7);

        Court court = Court.builder().id(UUID.randomUUID()).name("Court 1").isActive(true).build();
        when(courtRepository.findByIsActiveTrueAndIsDeletedFalse()).thenReturn(List.of(court));

        Instant bStart = Instant.parse("2026-10-02T10:00:00Z");
        Instant bEnd = Instant.parse("2026-10-02T11:00:00Z");
        Booking booking = Booking.builder().id(UUID.randomUUID()).court(court).status(BookingStatus.CONFIRMED).startAt(bStart).endAt(bEnd).build();
        when(bookingRepository.findBookingsWithFilters(any(), any(), any(), any())).thenReturn(List.of(booking));

        when(memberRepository.countActiveMembers()).thenReturn(50L);
        when(memberRepository.countExpiringSoonMembers(any(), any())).thenReturn(5L);
        when(memberRepository.countExpiredMembers()).thenReturn(10L);

        when(orderRepository.findCompletedOrdersBetween(any(), any())).thenReturn(Collections.emptyList());
        when(lowStockAlertRepository.findAllActive()).thenReturn(Collections.emptyList());
        when(tabRepository.findAllByCreatedAtBetweenOrderByCreatedAtDesc(any(), any())).thenReturn(Collections.emptyList());

        Lead leadWon = Lead.builder().id(UUID.randomUUID()).status(LeadStatus.WON).createdAt(bStart).build();
        Lead leadNew = Lead.builder().id(UUID.randomUUID()).status(LeadStatus.NEW).createdAt(bStart).build();
        when(leadRepository.findAll()).thenReturn(List.of(leadWon, leadNew));

        OperationsKpisDto kpis = reportingService.getOperationsKpis(DateRangePreset.CUSTOM, start, end);

        assertThat(kpis.getCourtUtilization().getTotalBookings()).isEqualTo(1);
        assertThat(kpis.getCourtUtilization().getConfirmedBookings()).isEqualTo(1);
        assertThat(kpis.getCourtUtilization().getUtilizationPercentage()).isGreaterThan(BigDecimal.ZERO);

        assertThat(kpis.getMembershipKpi().getActiveMembers()).isEqualTo(50);
        assertThat(kpis.getMembershipKpi().getChurnRatePercentage()).isGreaterThan(BigDecimal.ZERO);

        assertThat(kpis.getLeadFunnel().getTotalLeads()).isEqualTo(2);
        assertThat(kpis.getLeadFunnel().getWonLeads()).isEqualTo(1);
        assertThat(kpis.getLeadFunnel().getConversionRatePercentage()).isEqualByComparingTo("50.00");
    }
}
