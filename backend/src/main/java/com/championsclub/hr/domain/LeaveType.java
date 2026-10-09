package com.championsclub.hr.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "leave_types")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaveType {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String code; // CASUAL, SICK, PAID, UNPAID

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "annual_quota", nullable = false, precision = 5, scale = 1)
    @Builder.Default
    private BigDecimal annualQuota = new BigDecimal("12.0");

    @Column(name = "is_paid", nullable = false)
    @Builder.Default
    private boolean isPaid = true;

    @Column(name = "carry_forward_max", nullable = false, precision = 5, scale = 1)
    @Builder.Default
    private BigDecimal carryForwardMax = BigDecimal.ZERO;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
