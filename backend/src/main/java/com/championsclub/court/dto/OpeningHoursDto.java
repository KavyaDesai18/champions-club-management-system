package com.championsclub.court.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OpeningHoursDto {

    private UUID id;
    private UUID courtId;
    private String courtName;
    private DayOfWeek dayOfWeek;
    private LocalDate specificDate;
    private LocalTime openTime;
    private LocalTime closeTime;
    private boolean isClosed;
    private String reason;
}
