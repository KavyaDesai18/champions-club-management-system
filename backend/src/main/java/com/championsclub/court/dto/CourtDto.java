package com.championsclub.court.dto;

import com.championsclub.court.domain.SportType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourtDto {
    private UUID id;
    private String name;
    private SportType sportType;
    private BigDecimal hourlyRateMember;
    private BigDecimal hourlyRateGuest;
    private boolean active;
}
