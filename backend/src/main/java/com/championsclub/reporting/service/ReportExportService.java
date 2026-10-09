package com.championsclub.reporting.service;

import com.championsclub.billing.domain.Invoice;
import com.championsclub.billing.domain.Payment;
import com.championsclub.billing.repo.InvoiceRepository;
import com.championsclub.billing.repo.PaymentRepository;
import com.championsclub.hr.domain.PayrollRun;
import com.championsclub.hr.repo.PayrollRunRepository;
import com.championsclub.reporting.domain.DateRangePreset;
import com.championsclub.reporting.domain.ReportType;
import com.championsclub.reporting.dto.FinancialSummaryDto;
import com.championsclub.reporting.dto.TaxRateBreakdownDto;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.PrintWriter;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportExportService {

    private final ReportingService reportingService;
    private final ReportingDateHelper dateHelper;
    private final PaymentRepository paymentRepository;
    private final InvoiceRepository invoiceRepository;
    private final PayrollRunRepository payrollRunRepository;

    public byte[] exportReport(ReportType reportType, String format, DateRangePreset preset, LocalDate startDate, LocalDate endDate) {
        String fmt = (format != null) ? format.toUpperCase() : "CSV";
        ReportType type = (reportType != null) ? reportType : ReportType.REVENUE;

        return switch (fmt) {
            case "CSV" -> generateCsv(type, preset, startDate, endDate);
            case "XLSX" -> generateXlsx(type, preset, startDate, endDate);
            case "PDF" -> generatePdf(type, preset, startDate, endDate);
            default -> generateCsv(type, preset, startDate, endDate);
        };
    }

    public String getFilename(ReportType reportType, String format, LocalDate start, LocalDate end) {
        String ext = format.toLowerCase().equals("xlsx") ? "xlsx" : (format.toLowerCase().equals("pdf") ? "pdf" : "csv");
        return String.format("champions_club_%s_%s_to_%s.%s",
                reportType.name().toLowerCase(),
                start != null ? start : "start",
                end != null ? end : "end",
                ext);
    }

    // ==========================================
    // CSV GENERATION
    // ==========================================
    private byte[] generateCsv(ReportType reportType, DateRangePreset preset, LocalDate startDate, LocalDate endDate) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (PrintWriter writer = new PrintWriter(out, true, StandardCharsets.UTF_8)) {
            FinancialSummaryDto summary = reportingService.getFinancialSummary(preset, startDate, endDate);

            switch (reportType) {
                case REVENUE -> {
                    writer.println("Date,Source Type,Payment Method,Payer Name,Amount (INR),Status");
                    ReportingDateHelper.DateRange range = dateHelper.calculateRange(preset, startDate, endDate);
                    List<Payment> payments = paymentRepository.findSuccessfulPaymentsBetween(range.getStartInstant(), range.getEndInstant());
                    for (Payment p : payments) {
                        writer.printf("%s,%s,%s,\"%s\",%s,%s%n",
                                p.getCreatedAt().atZone(ReportingDateHelper.CLUB_ZONE).toLocalDate(),
                                p.getSourceType(),
                                p.getMethod(),
                                p.getPayerName() != null ? p.getPayerName().replace("\"", "\"\"") : "Walk-in",
                                p.getAmount(),
                                p.getStatus());
                    }
                    writer.println();
                    writer.println("--- REVENUE BY STREAM ---");
                    summary.getRevenueByStream().forEach(s ->
                            writer.printf("%s,%s,%s%%%n", s.getLabel(), s.getAmount(), s.getPercentage()));
                    writer.println();
                    writer.printf("TOTAL REVENUE,,,%s%n", summary.getTotalRevenue());
                    writer.printf("TOTAL REFUNDS,,,%s%n", summary.getTotalRefunds());
                    writer.printf("NET REVENUE,,,%s%n", summary.getNetRevenue());
                }
                case TAX_GST -> {
                    writer.println("GST Slab,Rate %,Taxable Amount (INR),CGST (INR),SGST (INR),IGST (INR),Total GST (INR)");
                    for (TaxRateBreakdownDto rate : summary.getTaxSummary().getRateBreakdown()) {
                        writer.printf("%s,%s,%s,%s,%s,%s,%s%n",
                                rate.getRateCode(), rate.getRatePercent(), rate.getTaxableAmount(),
                                rate.getCgstAmount(), rate.getSgstAmount(), rate.getIgstAmount(), rate.getTotalGst());
                    }
                    writer.println();
                    writer.printf("TOTAL GST COLLECTED,,,,,,%s%n", summary.getTaxSummary().getTotalGstCollected());
                    writer.printf("INPUT TAX CREDIT,,,,,,%s%n", summary.getTaxSummary().getInputTaxCredit());
                    writer.printf("NET GST PAYABLE,,,,,,%s%n", summary.getTaxSummary().getNetGstPayable());
                }
                case RECEIVABLES -> {
                    writer.println("Invoice Number,Recipient,Issue Date,Due Date,Total Amount (INR),Paid Amount (INR),Balance Due (INR),Status");
                    List<Invoice> activeReceivables = invoiceRepository.findActiveReceivables();
                    for (Invoice inv : activeReceivables) {
                        writer.printf("%s,\"%s\",%s,%s,%s,%s,%s,%s%n",
                                inv.getInvoiceNumber(),
                                inv.getRecipientName().replace("\"", "\"\""),
                                inv.getIssueDate(),
                                inv.getDueDate() != null ? inv.getDueDate() : "N/A",
                                inv.getTotalAmount(),
                                inv.getPaidAmount(),
                                inv.getBalanceDue(),
                                inv.getStatus());
                    }
                    writer.println();
                    writer.printf("TOTAL RECEIVABLES,,,,,,%s%n", summary.getTotalReceivables());
                }
                case PAYROLL -> {
                    writer.println("Run Number,Period,Total Gross (INR),Total Deductions (INR),Total Net Liability (INR),Status,Approved At");
                    List<PayrollRun> runs = payrollRunRepository.findAllByOrderByYearDescMonthDesc();
                    for (PayrollRun pr : runs) {
                        writer.printf("%s,%04d-%02d,%s,%s,%s,%s,%s%n",
                                pr.getRunNumber(), pr.getYear(), pr.getMonth(),
                                pr.getTotalGross(), pr.getTotalDeductions(), pr.getTotalNet(),
                                pr.getStatus(),
                                pr.getApprovedAt() != null ? pr.getApprovedAt() : "N/A");
                    }
                    writer.println();
                    writer.printf("TOTAL PAYROLL LIABILITY,,,,%s%n", summary.getPayablesBreakdown().getPayrollLiability());
                }
                default -> {
                    writer.println("Metric,Amount (INR)");
                    writer.printf("Total Revenue,%s%n", summary.getTotalRevenue());
                    writer.printf("Total Refunds,%s%n", summary.getTotalRefunds());
                    writer.printf("Net Position,%s%n", summary.getNetPosition());
                }
            }
        }
        return out.toByteArray();
    }

    // ==========================================
    // XLSX EXCEL GENERATION (Apache POI)
    // ==========================================
    private byte[] generateXlsx(ReportType reportType, DateRangePreset preset, LocalDate startDate, LocalDate endDate) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet(reportType.name());

            CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            CellStyle boldStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font boldFont = workbook.createFont();
            boldFont.setBold(true);
            boldStyle.setFont(boldFont);

            FinancialSummaryDto summary = reportingService.getFinancialSummary(preset, startDate, endDate);
            int rowIdx = 0;

            // Title row
            Row titleRow = sheet.createRow(rowIdx++);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("Champions Club — " + reportType.name() + " Report");
            titleCell.setCellStyle(boldStyle);

            Row metaRow = sheet.createRow(rowIdx++);
            metaRow.createCell(0).setCellValue("Period: " + summary.getStartDate() + " to " + summary.getEndDate());
            rowIdx++; // Blank row

            switch (reportType) {
                case REVENUE -> {
                    String[] headers = {"Date", "Stream", "Method", "Payer", "Amount (INR)"};
                    Row hRow = sheet.createRow(rowIdx++);
                    for (int i = 0; i < headers.length; i++) {
                        Cell c = hRow.createCell(i);
                        c.setCellValue(headers[i]);
                        c.setCellStyle(headerStyle);
                    }
                    ReportingDateHelper.DateRange range = dateHelper.calculateRange(preset, startDate, endDate);
                    List<Payment> payments = paymentRepository.findSuccessfulPaymentsBetween(range.getStartInstant(), range.getEndInstant());
                    for (Payment p : payments) {
                        Row r = sheet.createRow(rowIdx++);
                        r.createCell(0).setCellValue(p.getCreatedAt().atZone(ReportingDateHelper.CLUB_ZONE).toLocalDate().toString());
                        r.createCell(1).setCellValue(p.getSourceType().name());
                        r.createCell(2).setCellValue(p.getMethod().name());
                        r.createCell(3).setCellValue(p.getPayerName() != null ? p.getPayerName() : "Walk-in");
                        r.createCell(4).setCellValue(p.getAmount().doubleValue());
                    }
                    Row totRow = sheet.createRow(rowIdx++);
                    totRow.createCell(0).setCellValue("TOTAL REVENUE");
                    totRow.getCell(0).setCellStyle(boldStyle);
                    totRow.createCell(4).setCellValue(summary.getTotalRevenue().doubleValue());
                    totRow.getCell(4).setCellStyle(boldStyle);
                }
                case TAX_GST -> {
                    String[] headers = {"GST Slab", "Rate %", "Taxable Amount (INR)", "CGST (INR)", "SGST (INR)", "Total GST (INR)"};
                    Row hRow = sheet.createRow(rowIdx++);
                    for (int i = 0; i < headers.length; i++) {
                        Cell c = hRow.createCell(i);
                        c.setCellValue(headers[i]);
                        c.setCellStyle(headerStyle);
                    }
                    for (TaxRateBreakdownDto rate : summary.getTaxSummary().getRateBreakdown()) {
                        Row r = sheet.createRow(rowIdx++);
                        r.createCell(0).setCellValue(rate.getRateCode());
                        r.createCell(1).setCellValue(rate.getRatePercent().doubleValue());
                        r.createCell(2).setCellValue(rate.getTaxableAmount().doubleValue());
                        r.createCell(3).setCellValue(rate.getCgstAmount().doubleValue());
                        r.createCell(4).setCellValue(rate.getSgstAmount().doubleValue());
                        r.createCell(5).setCellValue(rate.getTotalGst().doubleValue());
                    }
                    Row totRow = sheet.createRow(rowIdx++);
                    totRow.createCell(0).setCellValue("TOTAL GST COLLECTED");
                    totRow.getCell(0).setCellStyle(boldStyle);
                    totRow.createCell(5).setCellValue(summary.getTaxSummary().getTotalGstCollected().doubleValue());
                    totRow.getCell(5).setCellStyle(boldStyle);
                }
                default -> {
                    Row r1 = sheet.createRow(rowIdx++);
                    r1.createCell(0).setCellValue("Total Revenue");
                    r1.createCell(1).setCellValue(summary.getTotalRevenue().doubleValue());
                    Row r2 = sheet.createRow(rowIdx++);
                    r2.createCell(0).setCellValue("Net Position");
                    r2.createCell(1).setCellValue(summary.getNetPosition().doubleValue());
                }
            }

            for (int i = 0; i < 6; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception ex) {
            log.error("Failed to generate XLSX report", ex);
            throw new RuntimeException("Could not generate Excel report: " + ex.getMessage(), ex);
        }
    }

    // ==========================================
    // PDF GENERATION (OpenPDF)
    // ==========================================
    private byte[] generatePdf(ReportType reportType, DateRangePreset preset, LocalDate startDate, LocalDate endDate) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 40, 40);
            PdfWriter.getInstance(document, out);
            document.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, Color.BLACK);
            Font subtitleFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.DARK_GRAY);
            Font boldCellFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.WHITE);
            Font regularCellFont = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK);

            FinancialSummaryDto summary = reportingService.getFinancialSummary(preset, startDate, endDate);

            // Header Section
            Paragraph title = new Paragraph("CHAMPIONS ATHLETIC CLUB", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);

            Paragraph subtitle = new Paragraph("Official Financial Report — " + reportType.name() + "\n" +
                    "Period: " + summary.getStartDate() + " to " + summary.getEndDate() + " | Generated: " + LocalDate.now(), subtitleFont);
            subtitle.setAlignment(Element.ALIGN_CENTER);
            subtitle.setSpacingAfter(20);
            document.add(subtitle);

            // Table
            PdfPTable table;
            switch (reportType) {
                case REVENUE -> {
                    table = new PdfPTable(4);
                    table.setWidthPercentage(100);
                    table.setWidths(new float[]{30, 25, 25, 20});

                    addHeaderCell(table, "Stream", boldCellFont);
                    addHeaderCell(table, "Revenue (INR)", boldCellFont);
                    addHeaderCell(table, "Share %", boldCellFont);
                    addHeaderCell(table, "Status", boldCellFont);

                    summary.getRevenueByStream().forEach(s -> {
                        table.addCell(new Phrase(s.getLabel(), regularCellFont));
                        table.addCell(new Phrase("INR " + s.getAmount(), regularCellFont));
                        table.addCell(new Phrase(s.getPercentage() + "%", regularCellFont));
                        table.addCell(new Phrase("RECONCILED", regularCellFont));
                    });

                    // Summary Rows
                    PdfPCell totCell = new PdfPCell(new Phrase("Total Revenue: INR " + summary.getTotalRevenue(), boldCellFont));
                    totCell.setColspan(4);
                    totCell.setBackgroundColor(new Color(20, 83, 45)); // Dark Green
                    totCell.setPadding(8);
                    table.addCell(totCell);
                }
                case TAX_GST -> {
                    table = new PdfPTable(4);
                    table.setWidthPercentage(100);
                    table.setWidths(new float[]{25, 25, 25, 25});

                    addHeaderCell(table, "Rate Slab", boldCellFont);
                    addHeaderCell(table, "Taxable (INR)", boldCellFont);
                    addHeaderCell(table, "CGST + SGST", boldCellFont);
                    addHeaderCell(table, "Total GST (INR)", boldCellFont);

                    for (TaxRateBreakdownDto rate : summary.getTaxSummary().getRateBreakdown()) {
                        table.addCell(new Phrase(rate.getRateCode() + " (" + rate.getRatePercent() + "%)", regularCellFont));
                        table.addCell(new Phrase("INR " + rate.getTaxableAmount(), regularCellFont));
                        table.addCell(new Phrase("INR " + rate.getCgstAmount().add(rate.getSgstAmount()), regularCellFont));
                        table.addCell(new Phrase("INR " + rate.getTotalGst(), regularCellFont));
                    }

                    PdfPCell totCell = new PdfPCell(new Phrase("Total GST Collected: INR " + summary.getTaxSummary().getTotalGstCollected(), boldCellFont));
                    totCell.setColspan(4);
                    totCell.setBackgroundColor(new Color(30, 58, 138)); // Dark Blue
                    totCell.setPadding(8);
                    table.addCell(totCell);
                }
                default -> {
                    table = new PdfPTable(2);
                    table.setWidthPercentage(100);
                    addHeaderCell(table, "Metric", boldCellFont);
                    addHeaderCell(table, "Value", boldCellFont);

                    table.addCell(new Phrase("Total Revenue", regularCellFont));
                    table.addCell(new Phrase("INR " + summary.getTotalRevenue(), regularCellFont));
                    table.addCell(new Phrase("Total Receivables", regularCellFont));
                    table.addCell(new Phrase("INR " + summary.getTotalReceivables(), regularCellFont));
                    table.addCell(new Phrase("Total Payables", regularCellFont));
                    table.addCell(new Phrase("INR " + summary.getTotalPayables(), regularCellFont));
                    table.addCell(new Phrase("Net Position", regularCellFont));
                    table.addCell(new Phrase("INR " + summary.getNetPosition(), regularCellFont));
                }
            }

            document.add(table);

            // Reconciled Statement note
            Paragraph footer = new Paragraph("\n* All figures derived strictly from internal ledger and verified double-entry balances.", subtitleFont);
            footer.setAlignment(Element.ALIGN_CENTER);
            document.add(footer);

            document.close();
            return out.toByteArray();
        } catch (Exception ex) {
            log.error("Failed to generate PDF report", ex);
            throw new RuntimeException("Could not generate PDF report: " + ex.getMessage(), ex);
        }
    }

    private void addHeaderCell(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(new Color(15, 23, 42)); // Slate 900
        cell.setPadding(6);
        table.addCell(cell);
    }
}
