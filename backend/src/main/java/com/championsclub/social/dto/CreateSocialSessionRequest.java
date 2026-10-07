package com.championsclub.social.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateSocialSessionRequest {

    @NotNull(message = "courtId is required")
    private UUID courtId;

    @NotNull(message = "sportId is required")
    private UUID sportId;

    @NotBlank(message = "title is required")
    private String title;

    private String description;

    @NotNull(message = "startAt is required")
    private Instant startAt;

    @NotNull(message = "endAt is required")
    private Instant endAt;

    @NotNull(message = "capacity is required")
    @Min(value = 1, message = "capacity must be at least 1")
    private Integer capacity;

    @Builder.Default
    @Min(value = 0, message = "minParticipants cannot be negative")
    private Integer minParticipants = 4;

    @Builder.Default
    private BigDecimal feeMember = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal feeGuest = new BigDecimal("15.00");

    private String recurrenceRule;

    @Builder.Default
    private Integer repeatWeeks = 1;

    @Builder.Default
    private Boolean allowJuniors = true;

    @Builder.Default
    private Boolean countsTowardDailyQuota = false;
}
