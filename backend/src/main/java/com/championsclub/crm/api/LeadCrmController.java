package com.championsclub.crm.api;

import com.championsclub.crm.domain.LeadStatus;
import com.championsclub.crm.dto.AddLeadActivityRequest;
import com.championsclub.crm.dto.ConvertLeadRequest;
import com.championsclub.crm.dto.CrmFunnelStatsDto;
import com.championsclub.crm.dto.LeadActivityDto;
import com.championsclub.crm.dto.LeadDto;
import com.championsclub.crm.dto.ScheduleFollowUpRequest;
import com.championsclub.crm.dto.UpdateLeadStatusRequest;
import com.championsclub.crm.service.LeadService;
import com.championsclub.member.domain.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/crm/leads")
@Tag(name = "Lead CRM Operations", description = "Pipeline management, lead activities, and conversions")
@PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'FRONT_DESK')")
public class LeadCrmController {

    private final LeadService leadService;

    public LeadCrmController(LeadService leadService) {
        this.leadService = leadService;
    }

    @GetMapping
    @Operation(summary = "List leads with optional status filter or search query")
    public ResponseEntity<List<LeadDto>> getLeads(
            @RequestParam(value = "status", required = false) LeadStatus status,
            @RequestParam(value = "search", required = false) String search
    ) {
        return ResponseEntity.ok(leadService.getLeads(status, search));
    }

    @GetMapping("/overdue")
    @Operation(summary = "Get list of leads with overdue follow-up dates")
    public ResponseEntity<List<LeadDto>> getOverdueFollowUps() {
        return ResponseEntity.ok(leadService.getOverdueFollowUps());
    }

    @GetMapping("/funnel")
    @Operation(summary = "Get CRM pipeline conversion funnel metrics")
    public ResponseEntity<CrmFunnelStatsDto> getFunnelStats() {
        return ResponseEntity.ok(leadService.getFunnelStats());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get full lead details with activities and quotes")
    public ResponseEntity<LeadDto> getLeadById(@PathVariable UUID id) {
        return ResponseEntity.ok(leadService.getLeadById(id));
    }

    @PutMapping("/{id}/status")
    @Operation(summary = "Update lead pipeline status")
    public ResponseEntity<LeadDto> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateLeadStatusRequest request,
            Authentication authentication
    ) {
        User actor = authentication != null && authentication.getPrincipal() instanceof User u ? u : null;
        return ResponseEntity.ok(leadService.updateLeadStatus(id, request, actor));
    }

    @PostMapping("/{id}/activities")
    @Operation(summary = "Add an activity log (note, call, email) to a lead")
    public ResponseEntity<LeadActivityDto> addActivity(
            @PathVariable UUID id,
            @Valid @RequestBody AddLeadActivityRequest request,
            Authentication authentication
    ) {
        User actor = authentication != null && authentication.getPrincipal() instanceof User u ? u : null;
        return ResponseEntity.ok(leadService.addActivity(id, request, actor));
    }

    @PostMapping("/{id}/follow-up")
    @Operation(summary = "Schedule or reschedule a follow-up reminder")
    public ResponseEntity<LeadDto> scheduleFollowUp(
            @PathVariable UUID id,
            @Valid @RequestBody ScheduleFollowUpRequest request,
            Authentication authentication
    ) {
        User actor = authentication != null && authentication.getPrincipal() instanceof User u ? u : null;
        return ResponseEntity.ok(leadService.scheduleFollowUp(id, request, actor));
    }

    @PostMapping("/{id}/convert")
    @Operation(summary = "One-click conversion of lead into active club member")
    public ResponseEntity<LeadDto> convertToMember(
            @PathVariable UUID id,
            @Valid @RequestBody ConvertLeadRequest request,
            Authentication authentication
    ) {
        User actor = authentication != null && authentication.getPrincipal() instanceof User u ? u : null;
        return ResponseEntity.ok(leadService.convertLeadToMember(id, request, actor));
    }
}
