package com.championsclub.reporting.api;

import com.championsclub.reporting.dto.FinancialSummaryDto;
import com.championsclub.reporting.dto.ReportShareResponse;
import com.championsclub.reporting.service.ReportShareService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/v1/public/reports", "/public/reports"})
@RequiredArgsConstructor
@Tag(name = "Public Report Shares", description = "Public read-only report access via signed tokens without authentication")
public class PublicReportShareController {

    private final ReportShareService reportShareService;

    @GetMapping("/share/{token}")
    @Operation(summary = "View shared report data using a signed token (no login required)")
    public ResponseEntity<FinancialSummaryDto> getSharedReport(@PathVariable String token) {
        return ResponseEntity.ok(reportShareService.getSharedReportData(token));
    }

    @GetMapping("/share/{token}/meta")
    @Operation(summary = "View shared report metadata (title, validity)")
    public ResponseEntity<ReportShareResponse> getSharedReportMeta(@PathVariable String token) {
        return ResponseEntity.ok(reportShareService.getShareMetadata(token));
    }
}
