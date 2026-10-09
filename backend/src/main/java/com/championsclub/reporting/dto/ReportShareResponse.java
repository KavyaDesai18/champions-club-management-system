package com.championsclub.reporting.dto;

import com.championsclub.reporting.domain.ReportType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportShareResponse {
    private UUID id;
    private String shareToken;
    private String shareUrl;
    private String title;
    private ReportType reportType;
    private LocalDate dateFrom;
    private LocalDate dateTo;
    private String preset;
    private Instant expiresAt;
    private boolean revoked;
    private Instant createdAt;
}
