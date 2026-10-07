package com.championsclub.court.dto;

import com.championsclub.court.domain.CourtStatus;
import com.championsclub.court.domain.SportType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourtDetailDto {

    private UUID id;
    private String name;
    private UUID sportId;
    private String sportName;
    private SportType sportType;
    private String surface;
    private boolean indoor;
    private CourtStatus status;
    private BigDecimal hourlyRateMember;
    private BigDecimal hourlyRateGuest;
    private boolean active;
    private Instant createdAt;
    private Instant updatedAt;
    private List<ConflictingBookingDto> futureActiveBookings;
}
