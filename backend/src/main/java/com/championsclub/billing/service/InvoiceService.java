package com.championsclub.billing.service;

import com.championsclub.billing.domain.*;
import com.championsclub.billing.dto.*;
import com.championsclub.billing.repo.*;
import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.member.domain.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final InvoiceLineRepository invoiceLineRepository;
    private final CreditNoteRepository creditNoteRepository;
    private final InvoicePaymentRepository invoicePaymentRepository;
    private final CorporateAccountRepository corporateAccountRepository;
    private final PaymentRepository paymentRepository;
    private final InvoiceSequenceService sequenceService;
    private final InvoicePdfService pdfService;

    @Transactional
    public Invoice createInvoiceForPayment(Payment payment, String description, BigDecimal taxPercent, User creator) {
        LocalDate today = LocalDate.now();
        InvoiceSequenceService.SequenceResult seq = sequenceService.nextInvoiceNumber(today);

        BigDecimal total = payment.getAmount().setScale(2, RoundingMode.HALF_UP);
        BigDecimal taxRate = taxPercent != null ? taxPercent : new BigDecimal("18.00");

        // GST calculation: inclusive or exclusive? By default in club pricing prices are tax inclusive
        // Base = Total / (1 + taxRate / 100)
        BigDecimal divisor = BigDecimal.ONE.add(taxRate.divide(new BigDecimal("100.00"), 4, RoundingMode.HALF_UP));
        BigDecimal subtotal = total.divide(divisor, 2, RoundingMode.HALF_UP);
        BigDecimal taxAmount = total.subtract(subtotal).setScale(2, RoundingMode.HALF_UP);
        BigDecimal cgst = taxAmount.divide(new BigDecimal("2.00"), 2, RoundingMode.HALF_UP);
        BigDecimal sgst = taxAmount.subtract(cgst).setScale(2, RoundingMode.HALF_UP);

        String recipientName = payment.getPayerName() != null && !payment.getPayerName().isBlank()
                ? payment.getPayerName()
                : (payment.getMember() != null ? payment.getMember().getFullName() : "Walk-in Guest");

        Invoice invoice = Invoice.builder()
                .invoiceNumber(seq.documentNumber())
                .financialYear(seq.financialYear())
                .sequenceNumber(seq.sequenceNumber())
                .payment(payment)
                .corporateAccount(payment.getCorporateAccount())
                .member(payment.getMember())
                .recipientName(recipientName)
                .recipientEmail(payment.getPayerEmail() != null ? payment.getPayerEmail() : (payment.getMember() != null ? payment.getMember().getEmail() : null))
                .recipientPhone(payment.getPayerPhone() != null ? payment.getPayerPhone() : (payment.getMember() != null ? payment.getMember().getPhone() : null))
                .recipientGstin(payment.getCorporateAccount() != null ? payment.getCorporateAccount().getGstin() : null)
                .recipientAddress(payment.getCorporateAccount() != null ? payment.getCorporateAccount().getBillingAddress() : null)
                .sourceType(payment.getSourceType())
                .sourceId(payment.getSourceId())
                .subtotal(subtotal)
                .taxAmount(taxAmount)
                .cgstAmount(cgst)
                .sgstAmount(sgst)
                .igstAmount(BigDecimal.ZERO)
                .discountAmount(BigDecimal.ZERO)
                .totalAmount(total)
                .paidAmount(total)
                .balanceDue(BigDecimal.ZERO)
                .status(InvoiceStatus.PAID)
                .issueDate(today)
                .dueDate(today)
                .createdBy(creator)
                .build();

        InvoiceLine line = InvoiceLine.builder()
                .invoice(invoice)
                .itemDescription(description != null ? description : payment.getSourceType() + " charge")
                .quantity(1)
                .unitPrice(subtotal)
                .taxRatePercent(taxRate)
                .taxAmount(taxAmount)
                .cgstAmount(cgst)
                .sgstAmount(sgst)
                .lineTotal(total)
                .serviceDate(payment.getCreatedAt())
                .build();

        invoice.addLine(line);
        return invoiceRepository.save(invoice);
    }

    @Transactional
    public Invoice createConsolidatedCorporateInvoice(UUID corporateAccountId, LocalDate startDate, LocalDate endDate, User creator) {
        CorporateAccount corp = corporateAccountRepository.findById(corporateAccountId)
                .orElseThrow(() -> new ResourceNotFoundException("CorporateAccount", corporateAccountId));

        LocalDate today = LocalDate.now();
        InvoiceSequenceService.SequenceResult seq = sequenceService.nextInvoiceNumber(today);

        // Find all non-invoiced corporate payments for this account
        List<Payment> corpPayments = paymentRepository.findByCorporateAccountIdOrderByCreatedAtDesc(corporateAccountId);

        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal taxAmount = BigDecimal.ZERO;
        BigDecimal cgst = BigDecimal.ZERO;
        BigDecimal sgst = BigDecimal.ZERO;
        BigDecimal total = BigDecimal.ZERO;

        Invoice invoice = Invoice.builder()
                .invoiceNumber(seq.documentNumber())
                .financialYear(seq.financialYear())
                .sequenceNumber(seq.sequenceNumber())
                .corporateAccount(corp)
                .recipientName(corp.getCompanyName())
                .recipientGstin(corp.getGstin())
                .recipientAddress(corp.getBillingAddress())
                .recipientEmail(corp.getContactEmail())
                .recipientPhone(corp.getContactPhone())
                .sourceType(PaymentSourceType.INVOICE)
                .sourceId(corporateAccountId.toString())
                .status(InvoiceStatus.SENT)
                .issueDate(today)
                .dueDate(today.plusDays(30))
                .notes("Consolidated B2B monthly invoice for period " + startDate + " to " + endDate)
                .createdBy(creator)
                .build();

        for (Payment p : corpPayments) {
            BigDecimal pTotal = p.getAmount().setScale(2, RoundingMode.HALF_UP);
            BigDecimal pSubtotal = pTotal.divide(new BigDecimal("1.18"), 2, RoundingMode.HALF_UP);
            BigDecimal pTax = pTotal.subtract(pSubtotal);
            BigDecimal pCgst = pTax.divide(new BigDecimal("2.00"), 2, RoundingMode.HALF_UP);
            BigDecimal pSgst = pTax.subtract(pCgst);

            String empName = p.getPayerName() != null ? p.getPayerName() : (p.getMember() != null ? p.getMember().getFullName() : "Employee");
            String empId = p.getMember() != null ? p.getMember().getCorporateEmployeeId() : null;

            InvoiceLine line = InvoiceLine.builder()
                    .invoice(invoice)
                    .itemDescription(p.getSourceType() + " ref: " + p.getSourceId())
                    .quantity(1)
                    .unitPrice(pSubtotal)
                    .taxRatePercent(new BigDecimal("18.00"))
                    .taxAmount(pTax)
                    .cgstAmount(pCgst)
                    .sgstAmount(pSgst)
                    .lineTotal(pTotal)
                    .employeeName(empName)
                    .employeeId(empId)
                    .serviceDate(p.getCreatedAt())
                    .build();

            invoice.addLine(line);

            subtotal = subtotal.add(pSubtotal);
            taxAmount = taxAmount.add(pTax);
            cgst = cgst.add(pCgst);
            sgst = sgst.add(pSgst);
            total = total.add(pTotal);
        }

        invoice.setSubtotal(subtotal);
        invoice.setTaxAmount(taxAmount);
        invoice.setCgstAmount(cgst);
        invoice.setSgstAmount(sgst);
        invoice.setTotalAmount(total);
        invoice.setPaidAmount(BigDecimal.ZERO);
        invoice.setBalanceDue(total);

        return invoiceRepository.save(invoice);
    }

    @Transactional
    public CreditNote issueCreditNote(UUID invoiceId, BigDecimal refundAmount, String reason, Refund refund, User creator) {
        Invoice invoice = invoiceRepository.findByIdWithLock(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice", invoiceId));

        LocalDate today = LocalDate.now();
        InvoiceSequenceService.SequenceResult seq = sequenceService.nextCreditNoteNumber(today);

        BigDecimal amt = refundAmount.setScale(2, RoundingMode.HALF_UP);
        BigDecimal subtotal = amt.divide(new BigDecimal("1.18"), 2, RoundingMode.HALF_UP);
        BigDecimal tax = amt.subtract(subtotal);

        CreditNote creditNote = CreditNote.builder()
                .creditNoteNumber(seq.documentNumber())
                .financialYear(seq.financialYear())
                .sequenceNumber(seq.sequenceNumber())
                .invoice(invoice)
                .refund(refund)
                .reason(reason != null ? reason : "Refund issued")
                .subtotal(subtotal)
                .taxAmount(tax)
                .totalAmount(amt)
                .issueDate(today)
                .status(CreditNoteStatus.ISSUED)
                .createdBy(creator)
                .build();

        return creditNoteRepository.save(creditNote);
    }

    @Transactional
    public void voidInvoice(UUID invoiceId, String reason, User caller) {
        Invoice invoice = invoiceRepository.findByIdWithLock(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice", invoiceId));

        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new BusinessValidationException(
                    "Cannot void a PAID invoice. Issued invoices are immutable legal documents under GST regulations. Please issue a Credit Note instead.",
                    "VOID_PAID_INVOICE_FORBIDDEN"
            );
        }

        invoice.setStatus(InvoiceStatus.VOID);
        invoice.setNotes((invoice.getNotes() != null ? invoice.getNotes() + " | " : "") + "VOIDED: " + reason);
        invoiceRepository.save(invoice);
    }

    @Transactional
    public Invoice allocatePayment(UUID invoiceId, Payment payment, BigDecimal amount) {
        Invoice invoice = invoiceRepository.findByIdWithLock(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice", invoiceId));

        BigDecimal toAllocate = amount.min(invoice.getBalanceDue()).setScale(2, RoundingMode.HALF_UP);

        InvoicePayment alloc = InvoicePayment.builder()
                .invoice(invoice)
                .payment(payment)
                .amountAllocated(toAllocate)
                .build();
        invoicePaymentRepository.save(alloc);

        BigDecimal newPaid = invoice.getPaidAmount().add(toAllocate);
        BigDecimal newBalance = invoice.getTotalAmount().subtract(newPaid);

        invoice.setPaidAmount(newPaid);
        invoice.setBalanceDue(newBalance);
        if (newBalance.compareTo(BigDecimal.ZERO) <= 0) {
            invoice.setStatus(InvoiceStatus.PAID);
        }

        return invoiceRepository.save(invoice);
    }

    @Transactional(readOnly = true)
    public Invoice getInvoiceById(UUID id) {
        return invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice", id));
    }

    @Transactional(readOnly = true)
    public Page<InvoiceResponse> getInvoices(InvoiceStatus status, Boolean isCorporate, LocalDate startDate, LocalDate endDate, String search, Pageable pageable) {
        return invoiceRepository.findInvoicesFiltered(status, isCorporate, startDate, endDate, search, pageable)
                .map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public byte[] getInvoicePdf(UUID id) {
        Invoice invoice = getInvoiceById(id);
        return pdfService.generateInvoicePdf(invoice);
    }

    @Transactional(readOnly = true)
    public byte[] getCreditNotePdf(UUID creditNoteId) {
        CreditNote cn = creditNoteRepository.findById(creditNoteId)
                .orElseThrow(() -> new ResourceNotFoundException("CreditNote", creditNoteId));
        return pdfService.generateCreditNotePdf(cn);
    }

    public InvoiceResponse mapToResponse(Invoice inv) {
        List<InvoiceLineDto> lineDtos = inv.getLines().stream()
                .map(l -> InvoiceLineDto.builder()
                        .id(l.getId())
                        .itemDescription(l.getItemDescription())
                        .quantity(l.getQuantity())
                        .unitPrice(l.getUnitPrice())
                        .taxRatePercent(l.getTaxRatePercent())
                        .taxAmount(l.getTaxAmount())
                        .cgstAmount(l.getCgstAmount())
                        .sgstAmount(l.getSgstAmount())
                        .discountAmount(l.getDiscountAmount())
                        .lineTotal(l.getLineTotal())
                        .employeeName(l.getEmployeeName())
                        .employeeId(l.getEmployeeId())
                        .serviceDate(l.getServiceDate())
                        .build())
                .toList();

        List<CreditNoteResponse> cnDtos = creditNoteRepository.findByInvoiceId(inv.getId()).stream()
                .map(c -> CreditNoteResponse.builder()
                        .id(c.getId())
                        .creditNoteNumber(c.getCreditNoteNumber())
                        .financialYear(c.getFinancialYear())
                        .invoiceId(inv.getId())
                        .invoiceNumber(inv.getInvoiceNumber())
                        .refundId(c.getRefund() != null ? c.getRefund().getId() : null)
                        .reason(c.getReason())
                        .subtotal(c.getSubtotal())
                        .taxAmount(c.getTaxAmount())
                        .totalAmount(c.getTotalAmount())
                        .issueDate(c.getIssueDate())
                        .status(c.getStatus())
                        .createdAt(c.getCreatedAt())
                        .build())
                .toList();

        return InvoiceResponse.builder()
                .id(inv.getId())
                .invoiceNumber(inv.getInvoiceNumber())
                .financialYear(inv.getFinancialYear())
                .sequenceNumber(inv.getSequenceNumber())
                .paymentId(inv.getPayment() != null ? inv.getPayment().getId() : null)
                .corporateAccountId(inv.getCorporateAccount() != null ? inv.getCorporateAccount().getId() : null)
                .corporateCompanyName(inv.getCorporateAccount() != null ? inv.getCorporateAccount().getCompanyName() : null)
                .memberId(inv.getMember() != null ? inv.getMember().getId() : null)
                .recipientName(inv.getRecipientName())
                .recipientEmail(inv.getRecipientEmail())
                .recipientPhone(inv.getRecipientPhone())
                .recipientAddress(inv.getRecipientAddress())
                .recipientGstin(inv.getRecipientGstin())
                .sourceType(inv.getSourceType())
                .sourceId(inv.getSourceId())
                .subtotal(inv.getSubtotal())
                .taxAmount(inv.getTaxAmount())
                .cgstAmount(inv.getCgstAmount())
                .sgstAmount(inv.getSgstAmount())
                .igstAmount(inv.getIgstAmount())
                .discountAmount(inv.getDiscountAmount())
                .totalAmount(inv.getTotalAmount())
                .paidAmount(inv.getPaidAmount())
                .balanceDue(inv.getBalanceDue())
                .status(inv.getStatus())
                .dueDate(inv.getDueDate())
                .issueDate(inv.getIssueDate())
                .notes(inv.getNotes())
                .lines(lineDtos)
                .creditNotes(cnDtos)
                .createdAt(inv.getCreatedAt())
                .updatedAt(inv.getUpdatedAt())
                .build();
    }
}
