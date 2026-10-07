package com.championsclub.member.domain;

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
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "member_check_ins")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemberCheckIn {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "membership_id")
    private Membership membership;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_banner", nullable = false, length = 50)
    private CheckInStatus statusBanner;

    @Column(name = "days_left")
    private Integer daysLeft;

    @Column(name = "checked_in_at", nullable = false)
    @Builder.Default
    private Instant checkedInAt = Instant.now();

    @Column(name = "checked_in_by", nullable = false, length = 100)
    private String checkedInBy;

    @Column(length = 100)
    @Builder.Default
    private String location = "FRONT_DESK_MAIN";

    @Column(columnDefinition = "TEXT")
    private String notes;
}
