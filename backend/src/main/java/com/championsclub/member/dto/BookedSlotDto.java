package com.championsclub.member.dto;

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
public class BookedSlotDto {
    private UUID id;
    private String bookingReference;
    private String courtName;
    private String sport;
    private Instant startAt;
    private Instant endAt;
    private String timeWindow;
    private String status;
}
