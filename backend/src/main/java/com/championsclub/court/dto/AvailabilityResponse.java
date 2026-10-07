package com.championsclub.court.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AvailabilityResponse {

    private LocalDate date;
    private UUID sportId;
    private String sportName;
    private String clubTimezone;
    private boolean facilityClosed;
    private String closureReason;
    private List<CourtAvailabilityDto> courts;
}
