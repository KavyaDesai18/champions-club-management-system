package com.championsclub.billing.dto;

import com.championsclub.billing.domain.InvoiceStatus;
import com.championsclub.billing.domain.PaymentSourceType;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvoiceResponse {

    private UUID id;
    private String invoiceNumber;
    private String financialYear;
    private Long sequenceNumber;
    private UUID paymentId;
    private UUID corporateAccountId;
    private String corporateCompanyName;
    private UUID memberId;

    private String recipientName;
    private String recipientEmail;
    private String recipientPhone;
    private String recipientAddress;
    private String recipientGstin;

    private PaymentSourceType sourceType;
    private String sourceId;

    private BigDecimal subtotal;
    private BigDecimal taxAmount;
    private BigDecimal cgstAmount;
    private BigDecimal sgstAmount;
    private BigDecimal igstAmount;
    private BigDecimal discountAmount;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private BigDecimal balanceDue;

    private InvoiceStatus status;
    private LocalDate dueDate;
    private LocalDate issueDate;
    private String notes;

    private List<InvoiceLineDto> lines;
    private List<CreditNoteResponse> creditNotes;

    private Instant createdAt;
    private Instant updatedAt;
}
