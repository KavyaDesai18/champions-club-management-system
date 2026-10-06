package com.championsclub.member.api;

import com.championsclub.member.dto.ImportJobDto;
import com.championsclub.member.dto.ImportPreviewResponse;
import com.championsclub.member.service.BulkImportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/members/import")
@Tag(name = "Bulk Member Import", description = "Endpoints for previewing and executing bulk CSV/XLSX member spreadsheet imports")
public class BulkImportController {

    private final BulkImportService bulkImportService;

    public BulkImportController(BulkImportService bulkImportService) {
        this.bulkImportService = bulkImportService;
    }

    @PostMapping(value = "/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Dry-run preview bulk import", description = "Parses CSV or XLSX file and returns categorized VALID, DUPLICATE, and INVALID rows with error reasons")
    public ResponseEntity<ImportPreviewResponse> previewImport(
            @RequestParam("file") MultipartFile file,
            Authentication auth
    ) {
        String actor = auth != null ? auth.getName() : "MANAGER";
        return ResponseEntity.ok(bulkImportService.previewImport(file, actor));
    }

    @PostMapping(value = "/commit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Commit bulk import batch", description = "Atomically imports valid rows, skips duplicates idempotently, and generates import job summary")
    public ResponseEntity<ImportJobDto> commitImport(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "jobId", required = false) UUID jobId,
            Authentication auth
    ) {
        String actor = auth != null ? auth.getName() : "MANAGER";
        return ResponseEntity.ok(bulkImportService.commitImport(file, jobId, actor));
    }

    @GetMapping("/{jobId}/errors")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Download import error report", description = "Returns full JSON error log of rejected or invalid rows for troubleshooting")
    public ResponseEntity<String> getErrorReport(@PathVariable UUID jobId) {
        String reportJson = bulkImportService.getErrorReportJson(jobId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"import_errors_" + jobId + ".json\"")
                .contentType(MediaType.APPLICATION_JSON)
                .body(reportJson);
    }
}
