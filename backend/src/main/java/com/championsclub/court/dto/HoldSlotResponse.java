package com.championsclub.court.dto;

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
public class HoldSlotResponse {

    private UUID holdId;
    private String holdToken;
    private UUID courtId;
    private Instant startTime;
    private Instant endTime;
    private Instant expiresAt;
}
