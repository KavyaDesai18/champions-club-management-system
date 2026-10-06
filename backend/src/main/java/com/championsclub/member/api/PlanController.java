package com.championsclub.member.api;

import com.championsclub.member.dto.PlanDto;
import com.championsclub.member.service.PlanService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/plans")
@Tag(name = "Membership Plans", description = "Endpoints for viewing Gold, Silver, and Junior membership tiers and entitlements")
public class PlanController {

    private final PlanService planService;

    public PlanController(PlanService planService) {
        this.planService = planService;
    }

    @GetMapping
    @Operation(summary = "List all active plans", description = "Fetches Gold, Silver, and Junior plans with benefits for registration display")
    public ResponseEntity<List<PlanDto>> getAllPlans() {
        return ResponseEntity.ok(planService.getAllActivePlans());
    }

    @GetMapping("/{code}")
    @Operation(summary = "Get plan by tier code", description = "Fetches a specific plan by code e.g. GOLD, SILVER, JUNIOR")
    public ResponseEntity<PlanDto> getPlanByCode(@PathVariable String code) {
        return ResponseEntity.ok(PlanDto.fromEntity(planService.getPlanByCode(code)));
    }
}
