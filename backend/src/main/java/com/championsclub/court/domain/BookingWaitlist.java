package com.championsclub.court.domain;

import com.championsclub.member.domain.Member;
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
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "booking_waitlist")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingWaitlist {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "court_id", nullable = false)
    private Court court;

    @Column(name = "start_at", nullable = false)
    private Instant startAt;

    @Column(name = "end_at", nullable = false)
    private Instant endAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    @Builder.Default
    private WaitlistStatus status = WaitlistStatus.WAITING;

    @Column(name = "hold_expires_at")
    private Instant holdExpiresAt;

    @Column(name = "held_booking_id")
    private UUID heldBookingId;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "notified_at")
    private Instant notifiedAt;

    @Version
    @Column(nullable = false)
    @Builder.Default
    private Long version = 0L;
}
