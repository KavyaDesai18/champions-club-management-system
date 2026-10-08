package com.championsclub.billing.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "invoice_sequences")
@IdClass(InvoiceSequenceId.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvoiceSequence {

    @Id
    @Column(name = "financial_year", nullable = false, length = 20)
    private String financialYear;

    @Id
    @Column(name = "sequence_type", nullable = false, length = 20)
    private String sequenceType;

    @Column(name = "last_number", nullable = false)
    @Builder.Default
    private Long lastNumber = 0L;

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
