package com.championsclub.social.domain;

import com.championsclub.member.domain.User;
import com.championsclub.court.domain.Booking;
import com.championsclub.court.domain.Court;
import com.championsclub.court.domain.Sport;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "social_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SocialSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "court_id", nullable = false)
    private Court court;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sport_id", nullable = false)
    private Sport sport;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @Column(name = "parent_series_id")
    private UUID parentSeriesId;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "start_at", nullable = false)
    private Instant startAt;

    @Column(name = "end_at", nullable = false)
    private Instant endAt;

    @Column(nullable = false)
    private Integer capacity;

    @Column(name = "min_participants", nullable = false)
    @Builder.Default
    private Integer minParticipants = 4;

    @Column(name = "fee_member", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal feeMember = BigDecimal.ZERO;

    @Column(name = "fee_guest", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal feeGuest = new BigDecimal("15.00");

    @Column(name = "recurrence_rule", length = 255)
    private String recurrenceRule;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    @Builder.Default
    private SocialSessionStatus status = SocialSessionStatus.SCHEDULED;

    @Column(name = "allow_juniors", nullable = false)
    @Builder.Default
    private Boolean allowJuniors = true;

    @Column(name = "counts_toward_daily_quota", nullable = false)
    @Builder.Default
    private Boolean countsTowardDailyQuota = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Version
    @Column(nullable = false)
    @Builder.Default
    private Long version = 0L;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public boolean isScheduled() {
        return status == SocialSessionStatus.SCHEDULED;
    }

    public boolean isCancelled() {
        return status == SocialSessionStatus.CANCELLED;
    }

    public boolean isCompleted() {
        return status == SocialSessionStatus.COMPLETED;
    }
}
