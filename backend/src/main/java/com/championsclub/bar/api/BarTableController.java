package com.championsclub.bar.api;

import com.championsclub.bar.dto.BarTableDto;
import com.championsclub.bar.dto.MoveTableRequest;
import com.championsclub.bar.service.BarTableService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/bar/tables", "/api/bar/tables"})
@RequiredArgsConstructor
@Tag(name = "Bar Tables", description = "Floor plan, table map, occupancy status, and table transfers")
public class BarTableController {

    private final BarTableService tableService;

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'BAR_STAFF', 'FRONT_DESK', 'KITCHEN')")
    @Operation(summary = "Get all bar tables with status and current open tab info")
    public ResponseEntity<List<BarTableDto>> getAllTables() {
        return ResponseEntity.ok(tableService.getAllTables());
    }

    @PostMapping("/move-tab/{tabId}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'BAR_STAFF')")
    @Operation(summary = "Move an open tab to a new FREE table")
    public ResponseEntity<BarTableDto> moveTabToTable(
            @PathVariable UUID tabId,
            @Valid @RequestBody MoveTableRequest request
    ) {
        return ResponseEntity.ok(tableService.moveTabToTable(tabId, request.getTargetTableId()));
    }
}
