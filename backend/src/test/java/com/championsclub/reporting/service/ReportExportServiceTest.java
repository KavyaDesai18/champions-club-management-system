package com.championsclub.reporting.service;

import com.championsclub.billing.repo.InvoiceRepository;
import com.championsclub.billing.repo.PaymentRepository;
import com.championsclub.hr.repo.PayrollRunRepository;
import com.championsclub.reporting.domain.DateRangePreset;
import com.championsclub.reporting.domain.ReportType;
import com.championsclub.reporting.dto.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportExportServiceTest {

    @Mock private ReportingService reportingService;
    @Mock private PaymentRepository paymentRepository;
    @Mock private InvoiceRepository invoiceRepository;
    @Mock private PayrollRunRepository payrollRunRepository;

    private ReportingDateHelper dateHelper;
    private ReportExportService exportService;

    @BeforeEach
    void setUp() {
        dateHelper = new ReportingDateHelper();
        exportService = new ReportExportService(
                reportingService,
                dateHelper,
                paymentRepository,
                invoiceRepository,
                payrollRunRepository
        );
    }

    @Test
    @DisplayName("Generate CSV export produces valid non-empty byte content with headers")
    void testExportCsv() {
        FinancialSummaryDto mockSummary = FinancialSummaryDto.builder()
                .startDate(LocalDate.of(2026, 10, 1))
                .endDate(LocalDate.of(2026, 10, 31))
                .totalRevenue(new BigDecimal("15000.00"))
                .totalRefunds(BigDecimal.ZERO)
                .netRevenue(new BigDecimal("15000.00"))
                .revenueByStream(List.of(
                        StreamRevenueDto.builder().stream("COURTS").label("Courts").amount(new BigDecimal("15000.00")).percentage(new BigDecimal("100.00")).build()
                ))
                .build();

        when(reportingService.getFinancialSummary(any(), any(), any())).thenReturn(mockSummary);
        when(paymentRepository.findSuccessfulPaymentsBetween(any(), any())).thenReturn(Collections.emptyList());

        byte[] csv = exportService.exportReport(ReportType.REVENUE, "CSV", DateRangePreset.THIS_MONTH, null, null);

        assertThat(csv).isNotEmpty();
        String content = new String(csv);
        assertThat(content).contains("TOTAL REVENUE");
        assertThat(content).contains("15000.00");
    }

    @Test
    @DisplayName("Generate XLSX Excel export produces valid workbook bytes")
    void testExportXlsx() {
        FinancialSummaryDto mockSummary = FinancialSummaryDto.builder()
                .startDate(LocalDate.of(2026, 10, 1))
                .endDate(LocalDate.of(2026, 10, 31))
                .totalRevenue(new BigDecimal("25000.00"))
                .build();

        when(reportingService.getFinancialSummary(any(), any(), any())).thenReturn(mockSummary);
        when(paymentRepository.findSuccessfulPaymentsBetween(any(), any())).thenReturn(Collections.emptyList());

        byte[] xlsx = exportService.exportReport(ReportType.REVENUE, "XLSX", DateRangePreset.THIS_MONTH, null, null);

        assertThat(xlsx).isNotEmpty();
        // PK zip header bytes for .xlsx files
        assertThat(xlsx[0]).isEqualTo((byte) 'P');
        assertThat(xlsx[1]).isEqualTo((byte) 'K');
    }

    @Test
    @DisplayName("Generate PDF export produces valid PDF document bytes")
    void testExportPdf() {
        FinancialSummaryDto mockSummary = FinancialSummaryDto.builder()
                .startDate(LocalDate.of(2026, 10, 1))
                .endDate(LocalDate.of(2026, 10, 31))
                .totalRevenue(new BigDecimal("30000.00"))
                .revenueByStream(List.of(
                        StreamRevenueDto.builder().stream("COURTS").label("Courts").amount(new BigDecimal("30000.00")).percentage(new BigDecimal("100.00")).build()
                ))
                .build();

        when(reportingService.getFinancialSummary(any(), any(), any())).thenReturn(mockSummary);

        byte[] pdf = exportService.exportReport(ReportType.REVENUE, "PDF", DateRangePreset.THIS_MONTH, null, null);

        assertThat(pdf).isNotEmpty();
        // %PDF magic bytes
        assertThat(new String(pdf, 0, 4)).isEqualTo("%PDF");
    }
}
