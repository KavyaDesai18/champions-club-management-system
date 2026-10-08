package com.championsclub.billing.dto;

import com.championsclub.billing.domain.CreditNoteStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreditNoteResponse {

    private UUID id;
    private String creditNoteNumber;
    private String financialYear;
    private UUID invoiceId;
    private String invoiceNumber;
    private UUID refundId;
    private String reason;
    private BigDecimal subtotal;
    private BigDecimal taxAmount;
    private BigDecimal totalAmount;
    private LocalDate issueDate;
    private CreditNoteStatus status;
    private Instant createdAt;
}
