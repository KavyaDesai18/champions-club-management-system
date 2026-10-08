package com.championsclub.billing.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "corporate_accounts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CorporateAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "company_name", nullable = false, length = 200)
    private String companyName;

    @Column(nullable = false, unique = true, length = 20)
    private String gstin;

    @Column(name = "billing_address", nullable = false, columnDefinition = "TEXT")
    private String billingAddress;

    @Column(name = "contact_person", length = 150)
    private String contactPerson;

    @Column(name = "contact_email", length = 150)
    private String contactEmail;

    @Column(name = "contact_phone", length = 50)
    private String contactPhone;

    @Column(name = "credit_limit", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal creditLimit = new BigDecimal("50000.00");

    @Column(name = "used_credit", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal usedCredit = BigDecimal.ZERO;

    @Column(name = "payment_terms", nullable = false, length = 50)
    @Builder.Default
    private String paymentTerms = "NET_30";

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    public BigDecimal getAvailableCredit() {
        return creditLimit.subtract(usedCredit);
    }

    public boolean hasAvailableCredit(BigDecimal amount) {
        return getAvailableCredit().compareTo(amount) >= 0;
    }
}
