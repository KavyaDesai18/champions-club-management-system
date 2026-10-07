package com.championsclub.social.dto;

import com.championsclub.social.domain.SocialSessionStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SocialSessionResponse {

    private UUID id;
    private UUID courtId;
    private String courtName;
    private UUID sportId;
    private String sportName;
    private UUID bookingId;
    private UUID parentSeriesId;
    private String title;
    private String description;
    private Instant startAt;
    private Instant endAt;
    private Integer capacity;
    private Integer joinedCount;
    private Integer waitlistCount;
    private Integer spotsRemaining;
    private Boolean isFull;
    private Integer minParticipants;
    private BigDecimal feeMember;
    private BigDecimal feeGuest;
    private String recurrenceRule;
    private SocialSessionStatus status;
    private Boolean allowJuniors;
    private Boolean countsTowardDailyQuota;
    private List<SocialParticipantResponse> participants;
    private Instant createdAt;
}
