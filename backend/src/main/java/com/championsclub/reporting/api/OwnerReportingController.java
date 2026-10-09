package com.championsclub.reporting.api;

import com.championsclub.member.domain.User;
import com.championsclub.reporting.domain.DateRangePreset;
import org.springframework.security.core.Authentication;
import com.championsclub.reporting.domain.ReportType;
import com.championsclub.reporting.dto.*;
import com.championsclub.reporting.service.ReportExportService;
import com.championsclub.reporting.service.ReportShareService;
import com.championsclub.reporting.service.ReportingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/reporting", "/api/reporting"})
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Owner Dashboard & Reporting", description = "Read-optimized endpoints for financial summary, operations KPIs, exports, and report shares")
@PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
public class OwnerReportingController {

    private final ReportingService reportingService;
    private final ReportExportService reportExportService;
    private final ReportShareService reportShareService;

    @GetMapping("/summary")
    @Operation(summary = "Get comprehensive financial summary and net position")
    public ResponseEntity<FinancialSummaryDto> getFinancialSummary(
            @RequestParam(required = false, defaultValue = "THIS_MONTH") DateRangePreset preset,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        return ResponseEntity.ok(reportingService.getFinancialSummary(preset, startDate, endDate));
    }

    @GetMapping("/kpis")
    @Operation(summary = "Get operations KPIs (court utilization, peak heatmap, churn, top products, bar covers, lead funnel)")
    public ResponseEntity<OperationsKpisDto> getOperationsKpis(
            @RequestParam(required = false, defaultValue = "THIS_MONTH") DateRangePreset preset,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        return ResponseEntity.ok(reportingService.getOperationsKpis(preset, startDate, endDate));
    }

    @GetMapping("/export")
    @Operation(summary = "Export financial or operational report as CSV, XLSX, or PDF")
    public ResponseEntity<byte[]> exportReport(
            @RequestParam(required = false, defaultValue = "REVENUE") ReportType reportType,
            @RequestParam(required = false, defaultValue = "CSV") String format,
            @RequestParam(required = false, defaultValue = "THIS_MONTH") DateRangePreset preset,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        byte[] bytes = reportExportService.exportReport(reportType, format, preset, startDate, endDate);
        String filename = reportExportService.getFilename(reportType, format, startDate, endDate);

        MediaType mediaType = switch (format.toUpperCase()) {
            case "XLSX" -> MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            case "PDF" -> MediaType.APPLICATION_PDF;
            default -> MediaType.parseMediaType("text/csv");
        };

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(mediaType)
                .body(bytes);
    }

    @PostMapping("/share")
    @Operation(summary = "Create a shareable read-only report link with signed token and expiry")
    public ResponseEntity<ReportShareResponse> createReportShare(
            @Valid @RequestBody CreateReportShareRequest request,
            Authentication authentication
    ) {
        UUID userId = (authentication != null && authentication.getPrincipal() instanceof User u) ? u.getId() : null;
        return ResponseEntity.ok(reportShareService.createShare(request, userId));
    }

    @GetMapping("/shares")
    @Operation(summary = "List all report shares")
    public ResponseEntity<List<ReportShareResponse>> listReportShares() {
        return ResponseEntity.ok(reportShareService.listAllShares());
    }

    @PostMapping("/shares/{id}/revoke")
    @Operation(summary = "Revoke a report share link immediately")
    public ResponseEntity<ReportShareResponse> revokeReportShare(@PathVariable UUID id) {
        return ResponseEntity.ok(reportShareService.revokeShare(id));
    }
}
