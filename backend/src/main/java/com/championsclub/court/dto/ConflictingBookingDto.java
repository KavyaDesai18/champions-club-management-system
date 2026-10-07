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
public class ConflictingBookingDto {
    private UUID bookingId;
    private String bookingReference;
    private UUID userId;
    private String userName;
    private String userEmail;
    private Instant startTime;
    private Instant endTime;
    private String courtName;
}
