package com.championsclub.billing.service;

import com.championsclub.billing.domain.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class InvoicePdfServiceTest {

    private final InvoicePdfService pdfService = new InvoicePdfService();

    @Test
    @DisplayName("Generate Invoice PDF creates valid non-empty PDF document with %PDF- header")
    void testGenerateInvoicePdf() {
        Invoice invoice = Invoice.builder()
                .id(UUID.randomUUID())
                .invoiceNumber("INV-2026-27-00001")
                .recipientName("Alice Sharma")
                .recipientEmail("alice@example.com")
                .recipientPhone("9876543210")
                .recipientAddress("123 Indiranagar, Bangalore")
                .recipientGstin("29ABCDE1234F1Z5")
                .subtotal(new BigDecimal("100.00"))
                .taxAmount(new BigDecimal("18.00"))
                .cgstAmount(new BigDecimal("9.00"))
                .sgstAmount(new BigDecimal("9.00"))
                .totalAmount(new BigDecimal("118.00"))
                .paidAmount(new BigDecimal("118.00"))
                .balanceDue(BigDecimal.ZERO)
                .status(InvoiceStatus.PAID)
                .issueDate(LocalDate.now())
                .build();

        InvoiceLine line = InvoiceLine.builder()
                .itemDescription("Badminton Court 1 Booking (60 min)")
                .quantity(1)
                .unitPrice(new BigDecimal("100.00"))
                .taxRatePercent(new BigDecimal("18.00"))
                .taxAmount(new BigDecimal("18.00"))
                .lineTotal(new BigDecimal("118.00"))
                .build();
        invoice.addLine(line);

        byte[] pdf = pdfService.generateInvoicePdf(invoice);

        assertThat(pdf).isNotNull();
        assertThat(pdf.length).isGreaterThan(500);

        // Verify PDF Magic Bytes "%PDF-"
        String header = new String(pdf, 0, 5);
        assertThat(header).isEqualTo("%PDF-");
    }

    @Test
    @DisplayName("Generate Credit Note PDF creates valid %PDF- document")
    void testGenerateCreditNotePdf() {
        Invoice invoice = Invoice.builder()
                .invoiceNumber("INV-2026-27-00001")
                .build();

        CreditNote cn = CreditNote.builder()
                .creditNoteNumber("CN-2026-27-00001")
                .invoice(invoice)
                .reason("Customer cancellation refund")
                .subtotal(new BigDecimal("100.00"))
                .taxAmount(new BigDecimal("18.00"))
                .totalAmount(new BigDecimal("118.00"))
                .issueDate(LocalDate.now())
                .build();

        byte[] pdf = pdfService.generateCreditNotePdf(cn);

        assertThat(pdf).isNotNull();
        assertThat(new String(pdf, 0, 5)).isEqualTo("%PDF-");
    }
}
