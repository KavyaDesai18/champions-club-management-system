package com.championsclub.court.dto;

import jakarta.validation.constraints.NotBlank;
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
public class CreateBlackoutRequest {

    @NotNull(message = "Court ID is required")
    private UUID courtId;

    @NotNull(message = "Start time is required")
    private Instant startTime;

    @NotNull(message = "End time is required")
    private Instant endTime;

    @NotBlank(message = "Reason is required")
    private String reason;

    @Builder.Default
    private boolean confirmCancelAndNotify = false;
}
