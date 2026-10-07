package com.championsclub.court.domain;

import com.championsclub.member.domain.Member;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "booking_participants")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    @JsonIgnore
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id")
    private Member member;

    @Column(name = "guest_name", length = 150)
    private String guestName;

    @Column(name = "guest_phone", length = 30)
    private String guestPhone;

    @Column(name = "is_guest", nullable = false)
    @Builder.Default
    private boolean isGuest = false;

    @Column(name = "fee", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal fee = BigDecimal.ZERO;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
