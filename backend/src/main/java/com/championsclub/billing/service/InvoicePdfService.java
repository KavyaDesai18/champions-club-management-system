package com.championsclub.billing.service;

import com.championsclub.billing.domain.CreditNote;
import com.championsclub.billing.domain.Invoice;
import com.championsclub.billing.domain.InvoiceLine;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;

@Service
@Slf4j
public class InvoicePdfService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy");
    private static final Color PRIMARY_COLOR = new Color(24, 76, 120);
    private static final Color LIGHT_BG = new Color(245, 247, 250);
    private static final Color ACCENT_COLOR = new Color(16, 185, 129);

    public byte[] generateInvoicePdf(Invoice invoice) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 40, 40);
            PdfWriter.getInstance(document, baos);
            document.open();

            // 1. Club Header
            PdfPTable headerTable = new PdfPTable(2);
            headerTable.setWidthPercentage(100);
            headerTable.setWidths(new float[]{60, 40});

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20, PRIMARY_COLOR);
            Font subHeaderFont = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.DARK_GRAY);
            Font invoiceTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, Color.BLACK);

            PdfPCell leftHeader = new PdfPCell();
            leftHeader.setBorder(Rectangle.NO_BORDER);
            leftHeader.addElement(new Paragraph("CHAMPIONS CLUB", titleFont));
            leftHeader.addElement(new Paragraph("Premier Sports & Athletics Facility", subHeaderFont));
            leftHeader.addElement(new Paragraph("GSTIN: 29AAAAA0000A1Z5 | PAN: AAAAA0000A", subHeaderFont));
            leftHeader.addElement(new Paragraph("100 Club Road, Indiranagar, Bangalore - 560038", subHeaderFont));
            leftHeader.addElement(new Paragraph("contact@championsclub.com | +91 98765 43210", subHeaderFont));
            headerTable.addCell(leftHeader);

            PdfPCell rightHeader = new PdfPCell();
            rightHeader.setBorder(Rectangle.NO_BORDER);
            rightHeader.setHorizontalAlignment(Element.ALIGN_RIGHT);
            Paragraph invTitle = new Paragraph("TAX INVOICE", invoiceTitleFont);
            invTitle.setAlignment(Element.ALIGN_RIGHT);
            rightHeader.addElement(invTitle);

            Font metaFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.BLACK);
            Font metaValFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.DARK_GRAY);
            Paragraph meta = new Paragraph();
            meta.setAlignment(Element.ALIGN_RIGHT);
            meta.add(new Chunk("Invoice #: ", metaFont));
            meta.add(new Chunk(invoice.getInvoiceNumber() + "\n", metaValFont));
            meta.add(new Chunk("Date: ", metaFont));
            meta.add(new Chunk(invoice.getIssueDate().format(DATE_FMT) + "\n", metaValFont));
            if (invoice.getDueDate() != null) {
                meta.add(new Chunk("Due Date: ", metaFont));
                meta.add(new Chunk(invoice.getDueDate().format(DATE_FMT) + "\n", metaValFont));
            }
            meta.add(new Chunk("Status: ", metaFont));
            meta.add(new Chunk(invoice.getStatus().name() + "\n", metaValFont));
            rightHeader.addElement(meta);
            headerTable.addCell(rightHeader);

            document.add(headerTable);
            document.add(new Paragraph(" "));

            // 2. Bill To Block
            PdfPTable billToTable = new PdfPTable(1);
            billToTable.setWidthPercentage(100);
            PdfPCell billToCell = new PdfPCell();
            billToCell.setBackgroundColor(LIGHT_BG);
            billToCell.setPadding(10);
            billToCell.setBorderColor(new Color(220, 225, 230));

            Paragraph billTo = new Paragraph();
            billTo.add(new Chunk("BILLED TO:\n", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, PRIMARY_COLOR)));
            billTo.add(new Chunk(invoice.getRecipientName() + "\n", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, Color.BLACK)));
            if (invoice.getCorporateAccount() != null) {
                billTo.add(new Chunk("Company: " + invoice.getCorporateAccount().getCompanyName() + "\n", subHeaderFont));
            }
            if (invoice.getRecipientGstin() != null && !invoice.getRecipientGstin().isBlank()) {
                billTo.add(new Chunk("GSTIN: " + invoice.getRecipientGstin() + "\n", subHeaderFont));
            }
            if (invoice.getRecipientAddress() != null && !invoice.getRecipientAddress().isBlank()) {
                billTo.add(new Chunk(invoice.getRecipientAddress() + "\n", subHeaderFont));
            }
            if (invoice.getRecipientPhone() != null && !invoice.getRecipientPhone().isBlank()) {
                billTo.add(new Chunk("Phone: " + invoice.getRecipientPhone() + "  ", subHeaderFont));
            }
            if (invoice.getRecipientEmail() != null && !invoice.getRecipientEmail().isBlank()) {
                billTo.add(new Chunk("Email: " + invoice.getRecipientEmail(), subHeaderFont));
            }
            billToCell.addElement(billTo);
            billToTable.addCell(billToCell);
            document.add(billToTable);
            document.add(new Paragraph(" "));

            // 3. Line Items Table
            PdfPTable itemsTable = new PdfPTable(6);
            itemsTable.setWidthPercentage(100);
            itemsTable.setWidths(new float[]{8, 44, 10, 14, 10, 14});

            Font tableHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.WHITE);
            String[] headers = {"#", "Description", "Qty", "Rate (₹)", "GST %", "Total (₹)"};
            for (String h : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(h, tableHeaderFont));
                cell.setBackgroundColor(PRIMARY_COLOR);
                cell.setPadding(6);
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                itemsTable.addCell(cell);
            }

            Font itemFont = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK);
            int idx = 1;
            for (InvoiceLine line : invoice.getLines()) {
                PdfPCell c1 = new PdfPCell(new Phrase(String.valueOf(idx++), itemFont));
                c1.setHorizontalAlignment(Element.ALIGN_CENTER);
                c1.setPadding(6);
                itemsTable.addCell(c1);

                String desc = line.getItemDescription();
                if (line.getEmployeeName() != null && !line.getEmployeeName().isBlank()) {
                    desc += " (" + line.getEmployeeName() + ")";
                }
                PdfPCell c2 = new PdfPCell(new Phrase(desc, itemFont));
                c2.setPadding(6);
                itemsTable.addCell(c2);

                PdfPCell c3 = new PdfPCell(new Phrase(String.valueOf(line.getQuantity()), itemFont));
                c3.setHorizontalAlignment(Element.ALIGN_CENTER);
                c3.setPadding(6);
                itemsTable.addCell(c3);

                PdfPCell c4 = new PdfPCell(new Phrase(String.format("%.2f", line.getUnitPrice()), itemFont));
                c4.setHorizontalAlignment(Element.ALIGN_RIGHT);
                c4.setPadding(6);
                itemsTable.addCell(c4);

                PdfPCell c5 = new PdfPCell(new Phrase(line.getTaxRatePercent() + "%", itemFont));
                c5.setHorizontalAlignment(Element.ALIGN_CENTER);
                c5.setPadding(6);
                itemsTable.addCell(c5);

                PdfPCell c6 = new PdfPCell(new Phrase(String.format("%.2f", line.getLineTotal()), itemFont));
                c6.setHorizontalAlignment(Element.ALIGN_RIGHT);
                c6.setPadding(6);
                itemsTable.addCell(c6);
            }

            document.add(itemsTable);
            document.add(new Paragraph(" "));

            // 4. Totals Breakdown
            PdfPTable totalsTable = new PdfPTable(2);
            totalsTable.setWidthPercentage(45);
            totalsTable.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totalsTable.setWidths(new float[]{60, 40});

            addTotalRow(totalsTable, "Subtotal:", invoice.getSubtotal());
            if (invoice.getCgstAmount().compareTo(BigDecimal.ZERO) > 0) {
                addTotalRow(totalsTable, "CGST (9%):", invoice.getCgstAmount());
                addTotalRow(totalsTable, "SGST (9%):", invoice.getSgstAmount());
            } else if (invoice.getTaxAmount().compareTo(BigDecimal.ZERO) > 0) {
                addTotalRow(totalsTable, "GST (Total):", invoice.getTaxAmount());
            }
            if (invoice.getDiscountAmount().compareTo(BigDecimal.ZERO) > 0) {
                addTotalRow(totalsTable, "Discount:", invoice.getDiscountAmount().negate());
            }

            // Total Due
            Font totalFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, PRIMARY_COLOR);
            PdfPCell totalLabel = new PdfPCell(new Phrase("Total Amount:", totalFont));
            totalLabel.setBorder(Rectangle.TOP);
            totalLabel.setPadding(6);
            totalsTable.addCell(totalLabel);

            PdfPCell totalVal = new PdfPCell(new Phrase(String.format("₹%.2f", invoice.getTotalAmount()), totalFont));
            totalVal.setBorder(Rectangle.TOP);
            totalVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totalVal.setPadding(6);
            totalsTable.addCell(totalVal);

            addTotalRow(totalsTable, "Amount Paid:", invoice.getPaidAmount());
            addTotalRow(totalsTable, "Balance Due:", invoice.getBalanceDue());

            document.add(totalsTable);

            // 5. Notes & Footer
            document.add(new Paragraph(" "));
            Paragraph footer = new Paragraph();
            footer.setAlignment(Element.ALIGN_CENTER);
            footer.add(new Chunk("Thank you for being a valued athlete at Champions Club!\n", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, PRIMARY_COLOR)));
            footer.add(new Chunk("This is a computer-generated tax invoice and requires no physical signature.\n", subHeaderFont));
            footer.add(new Chunk("For inquiries or corporate accounts, email billing@championsclub.com", subHeaderFont));
            document.add(footer);

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate PDF for invoice {}: {}", invoice.getInvoiceNumber(), e.getMessage(), e);
            throw new RuntimeException("Could not generate PDF document", e);
        }
    }

    public byte[] generateCreditNotePdf(CreditNote cn) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 40, 40);
            PdfWriter.getInstance(document, baos);
            document.open();

            // Header
            Paragraph title = new Paragraph("CHAMPIONS CLUB - CREDIT NOTE", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, PRIMARY_COLOR));
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);

            Paragraph meta = new Paragraph();
            meta.setAlignment(Element.ALIGN_CENTER);
            meta.add(new Chunk("Credit Note #: " + cn.getCreditNoteNumber() + " | Date: " + cn.getIssueDate().format(DATE_FMT) + "\n", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.BLACK)));
            meta.add(new Chunk("Original Invoice #: " + cn.getInvoice().getInvoiceNumber() + "\n", FontFactory.getFont(FontFactory.HELVETICA, 10, Color.DARK_GRAY)));
            meta.add(new Chunk("Reason: " + cn.getReason() + "\n\n", FontFactory.getFont(FontFactory.HELVETICA, 10, Color.DARK_GRAY)));
            document.add(meta);

            PdfPTable table = new PdfPTable(2);
            table.setWidthPercentage(60);
            table.setHorizontalAlignment(Element.ALIGN_CENTER);

            addTotalRow(table, "Original Tax Base:", cn.getSubtotal());
            addTotalRow(table, "GST Reversal:", cn.getTaxAmount());
            addTotalRow(table, "Total Credit Amount:", cn.getTotalAmount());
            document.add(table);

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate PDF for credit note {}: {}", cn.getCreditNoteNumber(), e.getMessage());
            throw new RuntimeException("Could not generate Credit Note PDF", e);
        }
    }

    private void addTotalRow(PdfPTable table, String label, BigDecimal amount) {
        Font font = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.DARK_GRAY);
        PdfPCell lCell = new PdfPCell(new Phrase(label, font));
        lCell.setBorder(Rectangle.NO_BORDER);
        lCell.setPadding(4);
        table.addCell(lCell);

        PdfPCell vCell = new PdfPCell(new Phrase(String.format("₹%.2f", amount != null ? amount : BigDecimal.ZERO), font));
        vCell.setBorder(Rectangle.NO_BORDER);
        vCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        vCell.setPadding(4);
        table.addCell(vCell);
    }
}
