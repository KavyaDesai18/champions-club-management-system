package com.championsclub.billing.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CorporateAccountResponse {

    private UUID id;
    private String companyName;
    private String gstin;
    private String billingAddress;
    private String contactPerson;
    private String contactEmail;
    private String contactPhone;
    private BigDecimal creditLimit;
    private BigDecimal usedCredit;
    private BigDecimal availableCredit;
    private String paymentTerms;
    private Boolean isActive;
    private int memberCount;
    private int unpaidInvoiceCount;
    private Instant createdAt;
    private Instant updatedAt;
}
