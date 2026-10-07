package com.championsclub.court.dto;

import com.championsclub.court.domain.CourtStatus;
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
public class UpdateCourtRequest {

    private String name;
    private UUID sportId;
    private SportType sportType;
    private String surface;
    private Boolean indoor;
    private CourtStatus status;
    private BigDecimal hourlyRateMember;
    private BigDecimal hourlyRateGuest;
    private Boolean active;
}
