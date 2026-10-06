package com.championsclub.member.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "plans")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Plan {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String code; // GOLD, SILVER, JUNIOR

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "duration_months", nullable = false)
    @Builder.Default
    private Integer durationMonths = 12;

    @Column(name = "court_discount_pct", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal courtDiscountPct = BigDecimal.ZERO;

    @Column(name = "shop_discount_pct", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal shopDiscountPct = BigDecimal.ZERO;

    @Column(name = "bar_discount_pct", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal barDiscountPct = BigDecimal.ZERO;

    @Column(name = "free_courts", nullable = false)
    @Builder.Default
    private Boolean freeCourts = false;

    @Column(name = "max_bookings_per_day", nullable = false)
    @Builder.Default
    private Integer maxBookingsPerDay = 2;

    @Column(name = "advance_booking_days", nullable = false)
    @Builder.Default
    private Integer advanceBookingDays = 7;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @OneToMany(mappedBy = "plan", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("displayOrder ASC")
    @Builder.Default
    private List<PlanBenefit> benefits = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
