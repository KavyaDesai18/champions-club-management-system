package com.championsclub.social.dto;

import jakarta.validation.constraints.Min;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateSocialSessionRequest {

    private String title;
    private String description;

    @Min(value = 1, message = "capacity must be at least 1")
    private Integer capacity;

    @Min(value = 0, message = "minParticipants cannot be negative")
    private Integer minParticipants;

    private BigDecimal feeMember;
    private BigDecimal feeGuest;
    private Boolean allowJuniors;
    private Boolean countsTowardDailyQuota;

    @Builder.Default
    private Boolean updateWholeSeries = false;
}
