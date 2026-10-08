package com.championsclub.member.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Period;
import java.util.UUID;

@Entity
@Table(name = "members")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "member_no", nullable = false, unique = true, length = 50)
    private String memberNo;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(columnDefinition = "citext", nullable = false, unique = true)
    private String email;

    @Column(nullable = false, unique = true, length = 30)
    private String phone;

    @Column(nullable = false)
    private LocalDate dob;

    @Column(length = 20)
    private String gender;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(name = "photo_url", length = 500)
    private String photoUrl;

    @Column(name = "emergency_contact", length = 150)
    private String emergencyContact;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    @Builder.Default
    private MemberStatus status = MemberStatus.ACTIVE;

    @Column(name = "suspended_at")
    private LocalDate suspendedAt;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "plan_id")
    private Plan plan;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "corporate_account_id")
    private com.championsclub.billing.domain.CorporateAccount corporateAccount;

    @Column(name = "corporate_employee_id", length = 50)
    private String corporateEmployeeId;

    @Column(name = "can_charge_to_company", nullable = false)
    @Builder.Default
    private Boolean canChargeToCompany = false;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "start_date", nullable = false)
    @Builder.Default
    private LocalDate startDate = LocalDate.now();

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "wallet_balance", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal walletBalance = BigDecimal.ZERO;

    @Column(name = "guest_passes_remaining", nullable = false)
    @Builder.Default
    private Integer guestPassesRemaining = 0;

    @OneToOne(mappedBy = "member", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private Guardian guardian;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    public int calculateAge(LocalDate asOfDate) {
        if (dob == null) {
            return 0;
        }
        return Period.between(dob, asOfDate).getYears();
    }

    public boolean isMinor(LocalDate asOfDate) {
        return calculateAge(asOfDate) < 18;
    }

    public boolean isUpgradeDue(LocalDate asOfDate) {
        return plan != null && "JUNIOR".equalsIgnoreCase(plan.getCode()) && calculateAge(asOfDate) >= 18;
    }
}
