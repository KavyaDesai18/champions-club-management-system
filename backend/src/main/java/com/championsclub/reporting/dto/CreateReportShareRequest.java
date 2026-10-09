package com.championsclub.reporting.dto;

import com.championsclub.reporting.domain.DateRangePreset;
import com.championsclub.reporting.domain.ReportType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateReportShareRequest {

    @NotBlank(message = "Title is required")
    private String title;

    private ReportType reportType;

    private DateRangePreset preset;

    private LocalDate dateFrom;

    private LocalDate dateTo;

    @NotNull(message = "Expiry in hours is required")
    private Integer expireInHours; // e.g. 24, 72, 168 (7 days)
}
