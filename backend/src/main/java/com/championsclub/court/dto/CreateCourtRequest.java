package com.championsclub.court.dto;

import com.championsclub.court.domain.CourtStatus;
import com.championsclub.court.domain.SportType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class CreateCourtRequest {

    @NotBlank(message = "Court name is required")
    private String name;

    private UUID sportId;
    private SportType sportType;

    @Builder.Default
    private String surface = "SYNTHETIC";

    @Builder.Default
    private Boolean indoor = true;

    @Builder.Default
    private CourtStatus status = CourtStatus.ACTIVE;

    @NotNull(message = "Member hourly rate is required")
    private BigDecimal hourlyRateMember;

    @NotNull(message = "Guest hourly rate is required")
    private BigDecimal hourlyRateGuest;
}
