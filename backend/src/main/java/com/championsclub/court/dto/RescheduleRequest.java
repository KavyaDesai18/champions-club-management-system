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
public class RescheduleRequest {

    @NotNull(message = "New court ID is required")
    private UUID newCourtId;

    @NotNull(message = "New start time is required")
    private Instant newStartTime;

    private Instant newEndTime;

    private String reason;
}
