package com.championsclub.hr.dto;

import jakarta.validation.constraints.NotBlank;
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
public class RegularizeAttendanceRequest {

    @NotNull(message = "Clock in timestamp is required")
    private Instant clockIn;

    @NotNull(message = "Clock out timestamp is required")
    private Instant clockOut;

    @NotBlank(message = "Regularization reason is required")
    private String reason;
}
