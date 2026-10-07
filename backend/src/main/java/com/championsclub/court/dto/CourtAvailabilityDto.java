package com.championsclub.court.dto;

import com.championsclub.court.domain.CourtStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourtAvailabilityDto {

    private UUID courtId;
    private String courtName;
    private String sportName;
    private String surface;
    private boolean indoor;
    private CourtStatus status;
    private List<AvailabilitySlotDto> slots;
}
