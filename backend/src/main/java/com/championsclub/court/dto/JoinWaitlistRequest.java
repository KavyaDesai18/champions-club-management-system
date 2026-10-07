package com.championsclub.court.dto;

import jakarta.validation.constraints.NotNull;
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
public class JoinWaitlistRequest {

    @NotNull(message = "Court ID is required")
    private UUID courtId;

    @NotNull(message = "Start time is required")
    private Instant startTime;

    private Instant endTime;

    private UUID memberId;
}
