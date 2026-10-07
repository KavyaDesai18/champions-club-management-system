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
public class BlackoutDto {

    private UUID id;
    private UUID courtId;
    private String courtName;
    private Instant startTime;
    private Instant endTime;
    private String reason;
    private UUID createdById;
    private String createdByName;
    private Instant createdAt;
}
