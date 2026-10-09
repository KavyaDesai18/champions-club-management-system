package com.championsclub.crm.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleFollowUpRequest {

    @NotNull(message = "Follow-up time is required")
    private Instant followUpAt;

    private String note;
}
