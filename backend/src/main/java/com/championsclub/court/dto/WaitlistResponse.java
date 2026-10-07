package com.championsclub.court.dto;

import com.championsclub.court.domain.WaitlistStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WaitlistResponse {
    private UUID id;
    private UUID courtId;
    private String courtName;
    private Instant startTime;
    private Instant endTime;
    private UUID memberId;
    private String memberName;
    private String memberNo;
    private WaitlistStatus status;
    private Instant holdExpiresAt;
    private UUID heldBookingId;
    private Instant createdAt;
    private Instant notifiedAt;
}
