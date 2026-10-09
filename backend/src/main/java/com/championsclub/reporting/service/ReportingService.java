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
import com.championsclub.reporting.dto.*;
import com.championsclub.reporting.repo.ExpenseRepository;
import com.championsclub.shop.domain.LowStockAlert;
import com.championsclub.shop.domain.Order;
import com.championsclub.shop.domain.OrderItem;
import com.championsclub.shop.repo.LowStockAlertRepository;
import com.championsclub.shop.repo.OrderRepository;
import com.championsclub.shop.repo.SupplierBillRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportingService {

    private final ReportingDateHelper dateHelper;
    private final PaymentRepository paymentRepository;
    private final RefundRepository refundRepository;
    private final InvoiceRepository invoiceRepository;
    private final ExpenseRepository expenseRepository;
    private final SupplierBillRepository supplierBillRepository;
    private final PayrollRunRepository payrollRunRepository;
    private final MemberRepository memberRepository;
    private final BookingRepository bookingRepository;
    private final CourtRepository courtRepository;
    private final TabRepository tabRepository;
    private final OrderRepository orderRepository;
    private final LowStockAlertRepository lowStockAlertRepository;
    private final LeadRepository leadRepository;

    @Transactional(readOnly = true)
    public FinancialSummaryDto getFinancialSummary(DateRangePreset preset, LocalDate customStart, LocalDate customEnd) {
        ReportingDateHelper.DateRange range = dateHelper.calculateRange(preset, customStart, customEnd);
        LocalDate today = LocalDate.now(ReportingDateHelper.CLUB_ZONE);

        // 1. Fetch completed payments strictly in range
        List<Payment> payments = paymentRepository.findSuccessfulPaymentsBetween(range.getStartInstant(), range.getEndInstant());
        List<Refund> refunds = refundRepository.findSuccessfulRefundsBetween(range.getStartInstant(), range.getEndInstant());

        // Stream Totals (COURTS, SHOP, BAR, MEMBERSHIPS)
        BigDecimal courtsRevenue = BigDecimal.ZERO;
        BigDecimal shopRevenue = BigDecimal.ZERO;
        BigDecimal barRevenue = BigDecimal.ZERO;
        BigDecimal membershipsRevenue = BigDecimal.ZERO;

        Map<String, BigDecimal> paymentMethodMap = new LinkedHashMap<>();
        for (PaymentMethod pm : PaymentMethod.values()) {
            paymentMethodMap.put(pm.name(), BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        }

        for (Payment p : payments) {
            BigDecimal amt = p.getAmount() != null ? p.getAmount().setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO;

            // Stream classification
            switch (p.getSourceType()) {
                case BOOKING, SOCIAL -> courtsRevenue = courtsRevenue.add(amt);
                case ORDER -> shopRevenue = shopRevenue.add(amt);
                case TAB -> barRevenue = barRevenue.add(amt);
                case MEMBERSHIP -> membershipsRevenue = membershipsRevenue.add(amt);
                default -> courtsRevenue = courtsRevenue.add(amt);
            }

            // Payment method classification
            String methodKey = (p.getMethod() != null) ? p.getMethod().name() : PaymentMethod.CARD.name();
            paymentMethodMap.put(methodKey, paymentMethodMap.getOrDefault(methodKey, BigDecimal.ZERO).add(amt));
        }

        courtsRevenue = courtsRevenue.setScale(2, RoundingMode.HALF_UP);
        shopRevenue = shopRevenue.setScale(2, RoundingMode.HALF_UP);
        barRevenue = barRevenue.setScale(2, RoundingMode.HALF_UP);
        membershipsRevenue = membershipsRevenue.setScale(2, RoundingMode.HALF_UP);

        BigDecimal totalRevenue = courtsRevenue.add(shopRevenue).add(barRevenue).add(membershipsRevenue).setScale(2, RoundingMode.HALF_UP);

        // Calculate Stream percentages (safe against division by zero)
        BigDecimal divisor = totalRevenue.compareTo(BigDecimal.ZERO) > 0 ? totalRevenue : BigDecimal.ONE;
        List<StreamRevenueDto> streamList = List.of(
                StreamRevenueDto.builder()
                        .stream("COURTS")
                        .label("Courts & Reservations")
                        .amount(courtsRevenue)
                        .percentage(totalRevenue.compareTo(BigDecimal.ZERO) > 0
                                ? courtsRevenue.multiply(BigDecimal.valueOf(100)).divide(divisor, 2, RoundingMode.HALF_UP)
                                : BigDecimal.ZERO)
                        .build(),
                StreamRevenueDto.builder()
                        .stream("SHOP")
                        .label("Pro Shop & Merch")
                        .amount(shopRevenue)
                        .percentage(totalRevenue.compareTo(BigDecimal.ZERO) > 0
                                ? shopRevenue.multiply(BigDecimal.valueOf(100)).divide(divisor, 2, RoundingMode.HALF_UP)
                                : BigDecimal.ZERO)
                        .build(),
                StreamRevenueDto.builder()
                        .stream("BAR")
                        .label("Bar & Cafeteria Lounge")
                        .amount(barRevenue)
                        .percentage(totalRevenue.compareTo(BigDecimal.ZERO) > 0
                                ? barRevenue.multiply(BigDecimal.valueOf(100)).divide(divisor, 2, RoundingMode.HALF_UP)
                                : BigDecimal.ZERO)
                        .build(),
                StreamRevenueDto.builder()
                        .stream("MEMBERSHIPS")
                        .label("Club Memberships")
                        .amount(membershipsRevenue)
                        .percentage(totalRevenue.compareTo(BigDecimal.ZERO) > 0
                                ? membershipsRevenue.multiply(BigDecimal.valueOf(100)).divide(divisor, 2, RoundingMode.HALF_UP)
                                : BigDecimal.ZERO)
                        .build()
        );

        // Total Refunds
        BigDecimal totalRefunds = refunds.stream()
                .map(r -> r.getAmount() != null ? r.getAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal netRevenue = totalRevenue.subtract(totalRefunds).setScale(2, RoundingMode.HALF_UP);

        // 2. Tax Summary (GST collected strictly from non-void invoices issued in range or payments)
        List<Invoice> nonVoidInvoices = invoiceRepository.findNonVoidInvoicesBetween(range.getStartDate(), range.getEndDate());
        BigDecimal totalGstCollected = BigDecimal.ZERO;
        BigDecimal totalCgstCollected = BigDecimal.ZERO;
        BigDecimal totalSgstCollected = BigDecimal.ZERO;
        BigDecimal totalIgstCollected = BigDecimal.ZERO;

        BigDecimal taxable18 = BigDecimal.ZERO;
        BigDecimal taxable12 = BigDecimal.ZERO;
        BigDecimal taxable5 = BigDecimal.ZERO;
        BigDecimal taxable0 = BigDecimal.ZERO;

        for (Invoice inv : nonVoidInvoices) {
            BigDecimal invTax = inv.getTaxAmount() != null ? inv.getTaxAmount() : BigDecimal.ZERO;
            BigDecimal invCgst = inv.getCgstAmount() != null ? inv.getCgstAmount() : BigDecimal.ZERO;
            BigDecimal invSgst = inv.getSgstAmount() != null ? inv.getSgstAmount() : BigDecimal.ZERO;
            BigDecimal invIgst = inv.getIgstAmount() != null ? inv.getIgstAmount() : BigDecimal.ZERO;
            BigDecimal invSubtotal = inv.getSubtotal() != null ? inv.getSubtotal() : BigDecimal.ZERO;

            totalGstCollected = totalGstCollected.add(invTax);
            totalCgstCollected = totalCgstCollected.add(invCgst);
            totalSgstCollected = totalSgstCollected.add(invSgst);
            totalIgstCollected = totalIgstCollected.add(invIgst);

            // Approximate rate bucket attribution by tax ratio or source
            if (inv.getSourceType() == PaymentSourceType.BOOKING || inv.getSourceType() == PaymentSourceType.MEMBERSHIP) {
                taxable18 = taxable18.add(invSubtotal);
            } else if (inv.getSourceType() == PaymentSourceType.ORDER) {
                taxable12 = taxable12.add(invSubtotal);
            } else if (inv.getSourceType() == PaymentSourceType.TAB) {
                taxable5 = taxable5.add(invSubtotal);
            } else {
                taxable0 = taxable0.add(invSubtotal);
            }
        }

        // If invoices were empty but payments took place, compute standardized GST 18% for consistency
        if (totalGstCollected.compareTo(BigDecimal.ZERO) == 0 && totalRevenue.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal standardTaxRate = new BigDecimal("0.18");
            totalGstCollected = totalRevenue.multiply(standardTaxRate).divide(new BigDecimal("1.18"), 2, RoundingMode.HALF_UP);
            totalCgstCollected = totalGstCollected.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
            totalSgstCollected = totalGstCollected.subtract(totalCgstCollected);
            taxable18 = totalRevenue.subtract(totalGstCollected);
        }

        totalGstCollected = totalGstCollected.setScale(2, RoundingMode.HALF_UP);
        totalCgstCollected = totalCgstCollected.setScale(2, RoundingMode.HALF_UP);
        totalSgstCollected = totalSgstCollected.setScale(2, RoundingMode.HALF_UP);
        totalIgstCollected = totalIgstCollected.setScale(2, RoundingMode.HALF_UP);

        // Input tax credit on paid expenses in range
        BigDecimal inputTaxCredit = expenseRepository.sumTaxCreditInDateRange(range.getStartDate(), range.getEndDate());
        if (inputTaxCredit == null) inputTaxCredit = BigDecimal.ZERO;
        inputTaxCredit = inputTaxCredit.setScale(2, RoundingMode.HALF_UP);

        BigDecimal netGstPayable = totalGstCollected.subtract(inputTaxCredit).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);

        List<TaxRateBreakdownDto> rateBreakdowns = List.of(
                TaxRateBreakdownDto.builder()
                        .rateCode("GST_18")
                        .ratePercent(new BigDecimal("18.00"))
                        .taxableAmount(taxable18.setScale(2, RoundingMode.HALF_UP))
                        .cgstAmount(taxable18.multiply(new BigDecimal("0.09")).setScale(2, RoundingMode.HALF_UP))
                        .sgstAmount(taxable18.multiply(new BigDecimal("0.09")).setScale(2, RoundingMode.HALF_UP))
                        .igstAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                        .totalGst(taxable18.multiply(new BigDecimal("0.18")).setScale(2, RoundingMode.HALF_UP))
                        .build(),
                TaxRateBreakdownDto.builder()
                        .rateCode("GST_12")
                        .ratePercent(new BigDecimal("12.00"))
                        .taxableAmount(taxable12.setScale(2, RoundingMode.HALF_UP))
                        .cgstAmount(taxable12.multiply(new BigDecimal("0.06")).setScale(2, RoundingMode.HALF_UP))
                        .sgstAmount(taxable12.multiply(new BigDecimal("0.06")).setScale(2, RoundingMode.HALF_UP))
                        .igstAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                        .totalGst(taxable12.multiply(new BigDecimal("0.12")).setScale(2, RoundingMode.HALF_UP))
                        .build(),
                TaxRateBreakdownDto.builder()
                        .rateCode("GST_5")
                        .ratePercent(new BigDecimal("5.00"))
                        .taxableAmount(taxable5.setScale(2, RoundingMode.HALF_UP))
                        .cgstAmount(taxable5.multiply(new BigDecimal("0.025")).setScale(2, RoundingMode.HALF_UP))
                        .sgstAmount(taxable5.multiply(new BigDecimal("0.025")).setScale(2, RoundingMode.HALF_UP))
                        .igstAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                        .totalGst(taxable5.multiply(new BigDecimal("0.05")).setScale(2, RoundingMode.HALF_UP))
                        .build(),
                TaxRateBreakdownDto.builder()
                        .rateCode("GST_0")
                        .ratePercent(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                        .taxableAmount(taxable0.setScale(2, RoundingMode.HALF_UP))
                        .cgstAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                        .sgstAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                        .igstAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                        .totalGst(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                        .build()
        );

        TaxSummaryDto taxSummary = TaxSummaryDto.builder()
                .totalGstCollected(totalGstCollected)
                .totalCgstCollected(totalCgstCollected)
                .totalSgstCollected(totalSgstCollected)
                .totalIgstCollected(totalIgstCollected)
                .inputTaxCredit(inputTaxCredit)
                .netGstPayable(netGstPayable)
                .rateBreakdown(rateBreakdowns)
                .build();

        // 3. Receivables & Aging Buckets ("What is owed to us")
        List<Invoice> activeReceivables = invoiceRepository.findActiveReceivables();
        BigDecimal totalReceivables = BigDecimal.ZERO;
        BigDecimal recCurrentOrDueSoon = BigDecimal.ZERO;
        BigDecimal recOverdue1To30 = BigDecimal.ZERO;
        BigDecimal recOverdue31To60 = BigDecimal.ZERO;
        BigDecimal recOverdue61To90 = BigDecimal.ZERO;
        BigDecimal recOverdue90Plus = BigDecimal.ZERO;

        for (Invoice inv : activeReceivables) {
            BigDecimal due = inv.getBalanceDue() != null ? inv.getBalanceDue() : BigDecimal.ZERO;
            totalReceivables = totalReceivables.add(due);

            if (inv.getDueDate() == null || !inv.getDueDate().isBefore(today)) {
                recCurrentOrDueSoon = recCurrentOrDueSoon.add(due);
            } else {
                long daysOverdue = ChronoUnit.DAYS.between(inv.getDueDate(), today);
                if (daysOverdue <= 30) {
                    recOverdue1To30 = recOverdue1To30.add(due);
                } else if (daysOverdue <= 60) {
                    recOverdue31To60 = recOverdue31To60.add(due);
                } else if (daysOverdue <= 90) {
                    recOverdue61To90 = recOverdue61To90.add(due);
                } else {
                    recOverdue90Plus = recOverdue90Plus.add(due);
                }
            }
        }

        AgingBucketsDto receivablesAging = AgingBucketsDto.builder()
                .currentOrDueSoon(recCurrentOrDueSoon.setScale(2, RoundingMode.HALF_UP))
                .overdueDays1To30(recOverdue1To30.setScale(2, RoundingMode.HALF_UP))
                .overdueDays31To60(recOverdue31To60.setScale(2, RoundingMode.HALF_UP))
                .overdueDays61To90(recOverdue61To90.setScale(2, RoundingMode.HALF_UP))
                .overdueDays90Plus(recOverdue90Plus.setScale(2, RoundingMode.HALF_UP))
                .total(totalReceivables.setScale(2, RoundingMode.HALF_UP))
                .build();

        // 4. "What do we owe" (Payables):
        // 1) Supplier bills from purchase orders (P8)
        BigDecimal supplierBills = supplierBillRepository.calculateTotalUnpaidBills();
        if (supplierBills == null) supplierBills = BigDecimal.ZERO;

        // 2) Operating expenses (rent, utilities, repairs) pending
        BigDecimal expensesPending = expenseRepository.sumTotalByStatus(ExpenseStatus.PENDING);
        if (expensesPending == null) expensesPending = BigDecimal.ZERO;

        // 3) Payroll liability from P13 (APPROVED or REVIEW runs)
        BigDecimal payrollLiability = payrollRunRepository.sumUnpaidNetPayroll();
        if (payrollLiability == null) payrollLiability = BigDecimal.ZERO;

        // 4) GST payable (collected minus input credit)
        BigDecimal gstPayable = netGstPayable;

        // 5) Refunds pending
        BigDecimal refundsPending = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        // 6) Unsettled member wallet credits
        BigDecimal memberWalletCredits = memberRepository.sumUnsettledWalletBalances();
        if (memberWalletCredits == null) memberWalletCredits = BigDecimal.ZERO;

        BigDecimal totalPayables = supplierBills
                .add(expensesPending)
                .add(payrollLiability)
                .add(gstPayable)
                .add(refundsPending)
                .add(memberWalletCredits)
                .setScale(2, RoundingMode.HALF_UP);

        PayablesBreakdownDto payablesBreakdown = PayablesBreakdownDto.builder()
                .supplierBills(supplierBills.setScale(2, RoundingMode.HALF_UP))
                .expensesPending(expensesPending.setScale(2, RoundingMode.HALF_UP))
                .payrollLiability(payrollLiability.setScale(2, RoundingMode.HALF_UP))
                .gstPayable(gstPayable.setScale(2, RoundingMode.HALF_UP))
                .refundsPending(refundsPending)
                .unsettledMemberCredits(memberWalletCredits.setScale(2, RoundingMode.HALF_UP))
                .totalPayables(totalPayables)
                .build();

        // Payables aging:
        List<Expense> overdueExpenses = expenseRepository.findOverdueExpenses(today);
        BigDecimal overdueExpensesSum = overdueExpenses.stream()
                .map(e -> e.getTotalAmount() != null ? e.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal payDueSoon = totalPayables.subtract(overdueExpensesSum).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
        AgingBucketsDto payablesAging = AgingBucketsDto.builder()
                .currentOrDueSoon(payDueSoon)
                .overdueDays1To30(overdueExpensesSum.setScale(2, RoundingMode.HALF_UP))
                .overdueDays31To60(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                .overdueDays61To90(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                .overdueDays90Plus(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                .total(totalPayables)
                .build();

        // 5. Cash & Bank Position:
        // Cash collected via liquid methods minus disbursements (paid expenses + paid payroll + refunds)
        BigDecimal totalLiquidCollections = payments.stream()
                .filter(p -> p.getMethod() == PaymentMethod.CASH || p.getMethod() == PaymentMethod.CARD || p.getMethod() == PaymentMethod.UPI)
                .map(p -> p.getAmount() != null ? p.getAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal paidExpenses = expenseRepository.sumTotalByStatus(ExpenseStatus.PAID);
        if (paidExpenses == null) paidExpenses = BigDecimal.ZERO;

        BigDecimal paidPayroll = payrollRunRepository.sumPaidNetPayroll();
        if (paidPayroll == null) paidPayroll = BigDecimal.ZERO;

        BigDecimal cashAndBank = totalLiquidCollections.subtract(paidExpenses).subtract(paidPayroll).subtract(totalRefunds).setScale(2, RoundingMode.HALF_UP);

        // 6. Core Prompt Formula: Net Position = Receivables + Cash/Bank - Payables
        BigDecimal netPosition = totalReceivables.add(cashAndBank).subtract(totalPayables).setScale(2, RoundingMode.HALF_UP);

        // 7. Daily Trend Series
        List<DailyTrendPointDto> dailyTrend = generateDailyTrend(range.getStartDate(), range.getEndDate(), payments, refunds);

        // 8. Period Comparison
        List<Payment> prevPayments = paymentRepository.findSuccessfulPaymentsBetween(range.getPreviousStartInstant(), range.getPreviousEndInstant());
        BigDecimal prevRevenue = prevPayments.stream()
                .map(p -> p.getAmount() != null ? p.getAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal revChangeAmt = totalRevenue.subtract(prevRevenue);
        BigDecimal revChangePct = prevRevenue.compareTo(BigDecimal.ZERO) > 0
                ? revChangeAmt.multiply(BigDecimal.valueOf(100)).divide(prevRevenue, 2, RoundingMode.HALF_UP)
                : (totalRevenue.compareTo(BigDecimal.ZERO) > 0 ? BigDecimal.valueOf(100.00) : BigDecimal.ZERO);

        PeriodComparisonDto comparison = PeriodComparisonDto.builder()
                .previousRevenue(prevRevenue)
                .revenueChangeAmount(revChangeAmt)
                .revenueChangePercentage(revChangePct)
                .previousNetPosition(netPosition)
                .netPositionChangeAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                .netPositionChangePercentage(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                .build();

        return FinancialSummaryDto.builder()
                .preset(preset != null ? preset.name() : DateRangePreset.THIS_MONTH.name())
                .startDate(range.getStartDate())
                .endDate(range.getEndDate())
                .currency("INR")
                .totalRevenue(totalRevenue)
                .revenueByStream(streamList)
                .revenueByPaymentMethod(paymentMethodMap)
                .totalRefunds(totalRefunds)
                .netRevenue(netRevenue)
                .taxSummary(taxSummary)
                .totalReceivables(totalReceivables.setScale(2, RoundingMode.HALF_UP))
                .receivablesAging(receivablesAging)
                .totalPayables(totalPayables)
                .payablesBreakdown(payablesBreakdown)
                .payablesAging(payablesAging)
                .cashAndBank(cashAndBank)
                .netPosition(netPosition)
                .dailyTrend(dailyTrend)
                .comparison(comparison)
                .build();
    }

    private List<DailyTrendPointDto> generateDailyTrend(LocalDate start, LocalDate end, List<Payment> payments, List<Refund> refunds) {
        List<DailyTrendPointDto> points = new ArrayList<>();
        LocalDate curr = start;

        // Group payments by date in Asia/Kolkata timezone
        Map<LocalDate, List<Payment>> paymentsByDate = payments.stream()
                .collect(Collectors.groupingBy(p -> p.getCreatedAt().atZone(ReportingDateHelper.CLUB_ZONE).toLocalDate()));

        Map<LocalDate, List<Refund>> refundsByDate = refunds.stream()
                .collect(Collectors.groupingBy(r -> r.getCreatedAt().atZone(ReportingDateHelper.CLUB_ZONE).toLocalDate()));

        while (!curr.isAfter(end)) {
            List<Payment> dayPayments = paymentsByDate.getOrDefault(curr, Collections.emptyList());
            List<Refund> dayRefunds = refundsByDate.getOrDefault(curr, Collections.emptyList());

            BigDecimal cAmt = BigDecimal.ZERO;
            BigDecimal sAmt = BigDecimal.ZERO;
            BigDecimal bAmt = BigDecimal.ZERO;
            BigDecimal mAmt = BigDecimal.ZERO;

            for (Payment p : dayPayments) {
                BigDecimal amt = p.getAmount() != null ? p.getAmount() : BigDecimal.ZERO;
                switch (p.getSourceType()) {
                    case BOOKING, SOCIAL -> cAmt = cAmt.add(amt);
                    case ORDER -> sAmt = sAmt.add(amt);
                    case TAB -> bAmt = bAmt.add(amt);
                    case MEMBERSHIP -> mAmt = mAmt.add(amt);
                    default -> cAmt = cAmt.add(amt);
                }
            }

            BigDecimal refAmt = dayRefunds.stream()
                    .map(r -> r.getAmount() != null ? r.getAmount() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal tot = cAmt.add(sAmt).add(bAmt).add(mAmt);

            points.add(DailyTrendPointDto.builder()
                    .date(curr)
                    .label(curr.toString())
                    .courts(cAmt.setScale(2, RoundingMode.HALF_UP))
                    .shop(sAmt.setScale(2, RoundingMode.HALF_UP))
                    .bar(bAmt.setScale(2, RoundingMode.HALF_UP))
                    .memberships(mAmt.setScale(2, RoundingMode.HALF_UP))
                    .totalRevenue(tot.setScale(2, RoundingMode.HALF_UP))
                    .refunds(refAmt.setScale(2, RoundingMode.HALF_UP))
                    .netRevenue(tot.subtract(refAmt).setScale(2, RoundingMode.HALF_UP))
                    .build());

            curr = curr.plusDays(1);
        }

        return points;
    }

    @Transactional(readOnly = true)
    public OperationsKpisDto getOperationsKpis(DateRangePreset preset, LocalDate customStart, LocalDate customEnd) {
        ReportingDateHelper.DateRange range = dateHelper.calculateRange(preset, customStart, customEnd);
        LocalDate today = LocalDate.now(ReportingDateHelper.CLUB_ZONE);

        // 1. Court Utilization %
        List<Court> activeCourts = courtRepository.findByIsActiveTrueAndIsDeletedFalse();
        long activeCourtsCount = Math.max(1, activeCourts.size());
        long daysInRange = Math.max(1, ChronoUnit.DAYS.between(range.getStartDate(), range.getEndDate()) + 1);

        // Facility open 06:00 to 23:00 = 17 operating hours/day
        long totalAvailableHours = activeCourtsCount * 17 * daysInRange;

        List<Booking> rangeBookings = bookingRepository.findBookingsWithFilters(null, null, range.getStartInstant(), range.getEndInstant());

        long totalBookingsCount = rangeBookings.size();
        long confirmedBookingsCount = 0;
        long cancelledBookingsCount = 0;
        long noShowBookingsCount = 0;
        long totalBookedHours = 0;

        // Heatmap Matrix: 7 days (1=Mon..7=Sun) x 17 hours (6..22)
        int[][] heatmapCounts = new int[8][24];
        int maxHourlyCount = 1;

        for (Booking b : rangeBookings) {
            if (b.getStatus() == BookingStatus.CONFIRMED || b.getStatus() == BookingStatus.COMPLETED) {
                confirmedBookingsCount++;
                long durationMinutes = ChronoUnit.MINUTES.between(b.getStartAt(), b.getEndAt());
                totalBookedHours += Math.max(1, durationMinutes / 60);

                ZonedDateTime zdt = b.getStartAt().atZone(ReportingDateHelper.CLUB_ZONE);
                int dow = zdt.getDayOfWeek().getValue(); // 1 = Monday, 7 = Sunday
                int hour = zdt.getHour();
                if (hour >= 6 && hour <= 22) {
                    heatmapCounts[dow][hour]++;
                    if (heatmapCounts[dow][hour] > maxHourlyCount) {
                        maxHourlyCount = heatmapCounts[dow][hour];
                    }
                }
            } else if (b.getStatus() == BookingStatus.CANCELLED) {
                cancelledBookingsCount++;
            } else if (b.getStatus() == BookingStatus.NO_SHOW) {
                noShowBookingsCount++;
            }
        }

        BigDecimal utilizationPct = BigDecimal.valueOf(totalBookedHours)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(Math.max(1, totalAvailableHours)), 2, RoundingMode.HALF_UP);

        BigDecimal cancelPct = (totalBookingsCount > 0)
                ? BigDecimal.valueOf(cancelledBookingsCount * 100.0 / totalBookingsCount).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        BigDecimal noShowPct = (totalBookingsCount > 0)
                ? BigDecimal.valueOf(noShowBookingsCount * 100.0 / totalBookingsCount).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        CourtUtilizationDto courtUtilization = CourtUtilizationDto.builder()
                .utilizationPercentage(utilizationPct)
                .totalAvailableHours(totalAvailableHours)
                .totalBookedHours(totalBookedHours)
                .totalBookings(totalBookingsCount)
                .confirmedBookings(confirmedBookingsCount)
                .cancelledBookings(cancelledBookingsCount)
                .cancellationRatePercentage(cancelPct)
                .noShowBookings(noShowBookingsCount)
                .noShowRatePercentage(noShowPct)
                .build();

        // Build Peak Hours Heatmap list
        String[] dayNames = {"", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"};
        List<HeatmapCellDto> heatmapList = new ArrayList<>();
        for (int dow = 1; dow <= 7; dow++) {
            for (int h = 6; h <= 22; h++) {
                int count = heatmapCounts[dow][h];
                double intensity = (maxHourlyCount > 0) ? (double) count / maxHourlyCount : 0.0;
                heatmapList.add(HeatmapCellDto.builder()
                        .dayOfWeek(dow)
                        .dayName(dayNames[dow])
                        .hour(h)
                        .bookingCount(count)
                        .intensity(Math.round(intensity * 100.0) / 100.0)
                        .build());
            }
        }

        // 2. Memberships KPI & Churn
        long activeMembers = memberRepository.countActiveMembers();
        long expiringSoon = memberRepository.countExpiringSoonMembers(today, today.plusDays(30));
        long expiredMembers = memberRepository.countExpiredMembers();

        long memberBase = Math.max(1, activeMembers + expiredMembers);
        BigDecimal churnRate = BigDecimal.valueOf(expiredMembers * 100.0 / memberBase).setScale(2, RoundingMode.HALF_UP);

        MembershipKpiDto membershipKpi = MembershipKpiDto.builder()
                .activeMembers(activeMembers)
                .expiringSoon30Days(expiringSoon)
                .expiredOrChurnedMembers(expiredMembers)
                .churnRatePercentage(churnRate)
                .build();

        // 3. Top Products & Low Stock
        List<Order> orders = orderRepository.findCompletedOrdersBetween(range.getStartInstant(), range.getEndInstant());
        Map<String, TopProductDto> productAgg = new HashMap<>();

        for (Order o : orders) {
            if (o.getItems() != null) {
                for (OrderItem item : o.getItems()) {
                    String name = item.getItemName() != null ? item.getItemName() : "Club Product";
                    TopProductDto agg = productAgg.computeIfAbsent(name, k -> TopProductDto.builder()
                            .productName(name)
                            .category("Pro Shop")
                            .unitsSold(0)
                            .revenue(BigDecimal.ZERO)
                            .build());
                    agg.setUnitsSold(agg.getUnitsSold() + (item.getQty() != null ? item.getQty() : 1));
                    agg.setRevenue(agg.getRevenue().add(item.getTotalPrice() != null ? item.getTotalPrice() : BigDecimal.ZERO));
                }
            }
        }

        List<TopProductDto> topProducts = productAgg.values().stream()
                .sorted(Comparator.comparing(TopProductDto::getRevenue).reversed())
                .limit(5)
                .collect(Collectors.toList());

        // Low stock list
        List<LowStockAlert> alerts = lowStockAlertRepository.findAllActive();
        List<LowStockItemDto> lowStockList = alerts.stream()
                .map(a -> LowStockItemDto.builder()
                        .sku(a.getVariant() != null ? a.getVariant().getSku() : "N/A")
                        .productName(a.getVariant() != null && a.getVariant().getProduct() != null ? a.getVariant().getProduct().getName() : "Club Product")
                        .variantName(a.getVariant() != null ? ((a.getVariant().getSize() != null ? a.getVariant().getSize() : "") + " " + (a.getVariant().getColor() != null ? a.getVariant().getColor() : "")).trim() : "Default")
                        .currentStock(a.getCurrentAvailable() != null ? a.getCurrentAvailable() : 0)
                        .reorderPoint(a.getReorderLevel() != null ? a.getReorderLevel() : 5)
                        .status(a.getCurrentAvailable() != null && a.getCurrentAvailable() <= 2 ? "CRITICAL" : "REORDER")
                        .build())
                .limit(10)
                .collect(Collectors.toList());

        // 4. Bar Covers & Avg Tab
        List<Tab> tabs = tabRepository.findAllByCreatedAtBetweenOrderByCreatedAtDesc(range.getStartInstant(), range.getEndInstant());
        long totalTabs = tabs.size();
        long totalCovers = 0;
        BigDecimal totalBarRev = BigDecimal.ZERO;

        for (Tab t : tabs) {
            totalCovers += (t.getTable() != null ? Math.max(1, t.getTable().getSeats()) : 1);
            totalBarRev = totalBarRev.add(t.getTotalAmount() != null ? t.getTotalAmount() : BigDecimal.ZERO);
        }

        BigDecimal avgTab = (totalTabs > 0)
                ? totalBarRev.divide(BigDecimal.valueOf(totalTabs), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        BarKpiDto barKpi = BarKpiDto.builder()
                .totalTabs(totalTabs)
                .totalCovers(totalCovers)
                .totalRevenue(totalBarRev.setScale(2, RoundingMode.HALF_UP))
                .averageTabAmount(avgTab)
                .build();

        // 5. Lead Conversion Funnel
        List<Lead> leads = leadRepository.findAll();
        long newLeads = 0;
        long contactedLeads = 0;
        long quoteOrTrialLeads = 0;
        long wonLeads = 0;
        long lostLeads = 0;

        for (Lead l : leads) {
            if (l.getCreatedAt() != null &&
                    !l.getCreatedAt().isBefore(range.getStartInstant()) &&
                    !l.getCreatedAt().isAfter(range.getEndInstant())) {
                switch (l.getStatus()) {
                    case NEW -> newLeads++;
                    case CONTACTED -> contactedLeads++;
                    case QUOTE_SENT, TRIAL_BOOKED -> quoteOrTrialLeads++;
                    case WON -> wonLeads++;
                    case LOST -> lostLeads++;
                }
            }
        }

        long totalLeadsInRange = newLeads + contactedLeads + quoteOrTrialLeads + wonLeads + lostLeads;
        BigDecimal leadConvRate = (totalLeadsInRange > 0)
                ? BigDecimal.valueOf(wonLeads * 100.0 / totalLeadsInRange).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        LeadFunnelDto leadFunnel = LeadFunnelDto.builder()
                .totalLeads(totalLeadsInRange)
                .newLeads(newLeads)
                .contactedLeads(contactedLeads)
                .quoteOrTrialLeads(quoteOrTrialLeads)
                .wonLeads(wonLeads)
                .lostLeads(lostLeads)
                .conversionRatePercentage(leadConvRate)
                .build();

        return OperationsKpisDto.builder()
                .preset(preset != null ? preset.name() : DateRangePreset.THIS_MONTH.name())
                .startDate(range.getStartDate())
                .endDate(range.getEndDate())
                .courtUtilization(courtUtilization)
                .peakHoursHeatmap(heatmapList)
                .membershipKpi(membershipKpi)
                .topProducts(topProducts)
                .lowStockList(lowStockList)
                .barKpi(barKpi)
                .leadFunnel(leadFunnel)
                .build();
    }
}
