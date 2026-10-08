package com.championsclub.billing.api;

import com.championsclub.billing.domain.Invoice;
import com.championsclub.billing.domain.InvoiceStatus;
import com.championsclub.billing.domain.Payment;
import com.championsclub.billing.dto.InvoiceResponse;
import com.championsclub.billing.service.InvoiceService;
import com.championsclub.billing.service.PaymentService;
import com.championsclub.member.domain.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/invoices", "/api/invoices"})
@RequiredArgsConstructor
@Tag(name = "Invoices", description = "Invoice listing, GST calculation, OpenPDF downloads, credit notes, and allocations")
public class InvoiceController {

    private final InvoiceService invoiceService;
    private final PaymentService paymentService;

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'FRONT_DESK')")
    @Operation(summary = "List invoices with multi-criteria filters")
    public ResponseEntity<Page<InvoiceResponse>> getInvoices(
            @RequestParam(required = false) InvoiceStatus status,
            @RequestParam(required = false) Boolean isCorporate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(invoiceService.getInvoices(status, isCorporate, startDate, endDate, search, pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get invoice details by ID")
    public ResponseEntity<InvoiceResponse> getInvoiceById(@PathVariable UUID id) {
        Invoice invoice = invoiceService.getInvoiceById(id);
        return ResponseEntity.ok(invoiceService.mapToResponse(invoice));
    }

    @GetMapping(value = "/{id}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    @Operation(summary = "Download invoice PDF generated via OpenPDF")
    public ResponseEntity<byte[]> downloadInvoicePdf(@PathVariable UUID id) {
        Invoice invoice = invoiceService.getInvoiceById(id);
        byte[] pdfBytes = invoiceService.getInvoicePdf(id);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"Invoice-" + invoice.getInvoiceNumber() + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }

    @GetMapping(value = "/credit-notes/{id}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    @Operation(summary = "Download Credit Note PDF generated via OpenPDF")
    public ResponseEntity<byte[]> downloadCreditNotePdf(@PathVariable UUID id) {
        byte[] pdfBytes = invoiceService.getCreditNotePdf(id);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"CreditNote-" + id + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }

    @PostMapping("/{id}/void")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Void an unpaid invoice (PAID invoices cannot be voided; credit notes are required)")
    public ResponseEntity<Map<String, String>> voidInvoice(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            org.springframework.security.core.Authentication authentication
    ) {
        User currentUser = extractUser(authentication);
        String reason = body.getOrDefault("reason", "Administrative void");
        invoiceService.voidInvoice(id, reason, currentUser);
        return ResponseEntity.ok(Map.of("message", "Invoice marked VOID", "id", id.toString()));
    }

    private User extractUser(org.springframework.security.core.Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return user;
        }
        return null;
    }

    @PostMapping("/{id}/allocate")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'FRONT_DESK')")
    @Operation(summary = "Allocate a payment towards an outstanding invoice balance")
    public ResponseEntity<InvoiceResponse> allocatePayment(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> body
    ) {
        UUID paymentId = UUID.fromString(body.get("paymentId").toString());
        BigDecimal amount = new BigDecimal(body.get("amount").toString());

        Payment payment = invoiceService.getInvoiceById(id).getPayment();
        Invoice updated = invoiceService.allocatePayment(id, payment, amount);
        return ResponseEntity.ok(invoiceService.mapToResponse(updated));
    }
}
