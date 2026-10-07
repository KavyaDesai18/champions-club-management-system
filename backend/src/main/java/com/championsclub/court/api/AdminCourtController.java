package com.championsclub.court.api;

import com.championsclub.court.domain.Sport;
import com.championsclub.court.dto.BlackoutDto;
import com.championsclub.court.dto.CourtDetailDto;
import com.championsclub.court.dto.CreateBlackoutRequest;
import com.championsclub.court.dto.CreateCourtRequest;
import com.championsclub.court.dto.CreateOpeningHoursRequest;
import com.championsclub.court.dto.CreatePricingRuleRequest;
import com.championsclub.court.dto.OpeningHoursDto;
import com.championsclub.court.dto.PricingQuoteRequest;
import com.championsclub.court.dto.PricingQuoteResponse;
import com.championsclub.court.dto.PricingRuleDto;
import com.championsclub.court.dto.UpdateCourtRequest;
import com.championsclub.court.service.CourtBlackoutService;
import com.championsclub.court.service.CourtManagementService;
import com.championsclub.court.service.PricingResolverService;
import com.championsclub.member.domain.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
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
@RequestMapping("/api/v1/admin")
@Tag(name = "Admin Operations", description = "Staff administrative operations for courts, hours, blackouts, and pricing")
@PreAuthorize("hasAnyRole('OWNER','MANAGER','FRONT_DESK')")
public class AdminCourtController {

    private final CourtManagementService courtManagementService;
    private final CourtBlackoutService courtBlackoutService;
    private final PricingResolverService pricingResolverService;

    public AdminCourtController(
            CourtManagementService courtManagementService,
            CourtBlackoutService courtBlackoutService,
            PricingResolverService pricingResolverService
    ) {
        this.courtManagementService = courtManagementService;
        this.courtBlackoutService = courtBlackoutService;
        this.pricingResolverService = pricingResolverService;
    }

    // --- COURTS ---

    @GetMapping("/courts")
    @Operation(summary = "List all courts for administration")
    public ResponseEntity<List<CourtDetailDto>> getAllCourts() {
        return ResponseEntity.ok(courtManagementService.getAllCourts());
    }

    @GetMapping("/courts/{courtId}")
    @Operation(summary = "Get court detail with future bookings info")
    public ResponseEntity<CourtDetailDto> getCourtById(@PathVariable UUID courtId) {
        return ResponseEntity.ok(courtManagementService.getCourtById(courtId));
    }

    @PostMapping("/courts")
    @Operation(summary = "Create a new court")
    public ResponseEntity<CourtDetailDto> createCourt(@Valid @RequestBody CreateCourtRequest request) {
        CourtDetailDto created = courtManagementService.createCourt(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/courts/{courtId}")
    @Operation(summary = "Update court details, surface, or status")
    public ResponseEntity<CourtDetailDto> updateCourt(
            @PathVariable UUID courtId,
            @Valid @RequestBody UpdateCourtRequest request
    ) {
        CourtDetailDto updated = courtManagementService.updateCourt(courtId, request);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/courts/{courtId}")
    @Operation(summary = "Soft delete a court")
    public ResponseEntity<Void> deleteCourt(@PathVariable UUID courtId) {
        courtManagementService.deleteCourt(courtId);
        return ResponseEntity.noContent().build();
    }

    // --- SPORTS ---

    @GetMapping("/sports")
    @Operation(summary = "List all sports")
    public ResponseEntity<List<Sport>> getAllSports() {
        return ResponseEntity.ok(courtManagementService.getAllSports());
    }

    @PostMapping("/sports")
    @Operation(summary = "Create a new sport")
    public ResponseEntity<Sport> createSport(
            @RequestParam("name") String name,
            @RequestParam(value = "defaultSessionMinutes", defaultValue = "60") int defaultSessionMinutes
    ) {
        Sport created = courtManagementService.createSport(name, defaultSessionMinutes);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // --- OPENING HOURS ---

    @GetMapping("/hours")
    @Operation(summary = "List all opening hours and holiday exceptions")
    public ResponseEntity<List<OpeningHoursDto>> getAllOpeningHours() {
        return ResponseEntity.ok(courtManagementService.getAllOpeningHours());
    }

    @PostMapping("/hours")
    @Operation(summary = "Create opening hours schedule or holiday closure")
    public ResponseEntity<OpeningHoursDto> createOpeningHours(@Valid @RequestBody CreateOpeningHoursRequest request) {
        OpeningHoursDto created = courtManagementService.createOpeningHours(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("/hours/{id}")
    @Operation(summary = "Delete opening hours rule")
    public ResponseEntity<Void> deleteOpeningHours(@PathVariable UUID id) {
        courtManagementService.deleteOpeningHours(id);
        return ResponseEntity.noContent().build();
    }

    // --- BLACKOUTS ---

    @GetMapping("/blackouts")
    @Operation(summary = "List all active court blackouts")
    public ResponseEntity<List<BlackoutDto>> getAllBlackouts() {
        return ResponseEntity.ok(courtBlackoutService.getAllBlackouts());
    }

    @PostMapping("/blackouts")
    @Operation(summary = "Create court blackout",
            description = "Blocks court for maintenance. If conflicting active bookings exist and confirmCancelAndNotify is false, returns 409 Conflict with the conflicting reservations.")
    public ResponseEntity<BlackoutDto> createBlackout(
            @Valid @RequestBody CreateBlackoutRequest request,
            Authentication authentication
    ) {
        UUID adminId = null;
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            adminId = user.getId();
        }
        BlackoutDto created = courtBlackoutService.createBlackout(request, adminId);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("/blackouts/{id}")
    @Operation(summary = "Delete court blackout")
    public ResponseEntity<Void> deleteBlackout(@PathVariable UUID id) {
        courtBlackoutService.deleteBlackout(id);
        return ResponseEntity.noContent().build();
    }

    // --- PRICING RULES ---

    @GetMapping("/pricing")
    @Operation(summary = "List all pricing rules sorted by priority")
    public ResponseEntity<List<PricingRuleDto>> getAllPricingRules() {
        return ResponseEntity.ok(courtManagementService.getAllPricingRules());
    }

    @PostMapping("/pricing")
    @Operation(summary = "Create a new pricing rule")
    public ResponseEntity<PricingRuleDto> createPricingRule(@Valid @RequestBody CreatePricingRuleRequest request) {
        PricingRuleDto created = courtManagementService.createPricingRule(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("/pricing/{id}")
    @Operation(summary = "Delete pricing rule")
    public ResponseEntity<Void> deletePricingRule(@PathVariable UUID id) {
        courtManagementService.deletePricingRule(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/pricing/preview")
    @Operation(summary = "Preview price resolution quote for testing")
    public ResponseEntity<PricingQuoteResponse> previewQuote(@Valid @RequestBody PricingQuoteRequest request) {
        PricingQuoteResponse response = pricingResolverService.calculateQuote(request);
        return ResponseEntity.ok(response);
    }
}
