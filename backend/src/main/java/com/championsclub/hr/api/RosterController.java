package com.championsclub.hr.api;

import com.championsclub.hr.dto.CreateRosterShiftRequest;
import com.championsclub.hr.dto.PublishRosterRequest;
import com.championsclub.hr.dto.RosterCoverageGapDto;
import com.championsclub.hr.dto.RosterShiftDto;
import com.championsclub.hr.service.HrEmployeeService;
import com.championsclub.hr.service.RosterService;
import com.championsclub.member.domain.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/hr/roster")
@Tag(name = "Staff Roster & Scheduling", description = "Planned weekly schedules, shift publishing, and coverage gap alerts")
public class RosterController {

    private final RosterService rosterService;
    private final HrEmployeeService employeeService;

    public RosterController(RosterService rosterService, HrEmployeeService employeeService) {
        this.rosterService = rosterService;
        this.employeeService = employeeService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'FRONT_DESK', 'BAR_STAFF', 'KITCHEN', 'SHOP_STAFF', 'COACH')")
    @Operation(summary = "Get roster shifts for a date range")
    public ResponseEntity<List<RosterShiftDto>> getRoster(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(rosterService.getRoster(from, to));
    }

    @GetMapping("/my-shifts")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get roster shifts assigned to current employee")
    public ResponseEntity<List<RosterShiftDto>> getMyShifts(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            Authentication authentication
    ) {
        User user = authentication != null && authentication.getPrincipal() instanceof User u ? u : null;
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        var emp = employeeService.getEmployeeByUserId(user.getId());
        return ResponseEntity.ok(rosterService.getEmployeeRoster(emp.getId(), from, to));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Create planned roster shift")
    public ResponseEntity<RosterShiftDto> createShift(@Valid @RequestBody CreateRosterShiftRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(rosterService.createShift(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Update planned roster shift (supports drag-and-drop)")
    public ResponseEntity<RosterShiftDto> updateShift(
            @PathVariable UUID id,
            @Valid @RequestBody CreateRosterShiftRequest request
    ) {
        return ResponseEntity.ok(rosterService.updateShift(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Delete planned roster shift")
    public ResponseEntity<Void> deleteShift(@PathVariable UUID id) {
        rosterService.deleteShift(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/publish")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Publish planned roster schedule for a week")
    public ResponseEntity<List<RosterShiftDto>> publishRoster(@Valid @RequestBody PublishRosterRequest request) {
        return ResponseEntity.ok(rosterService.publishRoster(request));
    }

    @GetMapping("/coverage-gaps")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Check vital role coverage gaps for a date")
    public ResponseEntity<List<RosterCoverageGapDto>> checkCoverageGaps(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return ResponseEntity.ok(rosterService.checkCoverageGaps(date));
    }
}
