package com.championsclub.court.dto;

import com.championsclub.court.domain.SlotState;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AvailabilitySlotDto {

    private Instant startTime;
    private Instant endTime;
    private LocalTime localStartTime;
    private LocalTime localEndTime;
    private SlotState state;
    private String reason;
    private BigDecimal price;
    private String formattedPrice;
    private UUID holdId;
    private UUID bookingId;
}
