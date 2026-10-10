package com.championsclub.common.seed;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Public REST endpoint for on-demand realistic demo data population.
 * Useful for demo showcases, test automation, and evaluators.
 */
@RestController
@RequestMapping("/api/v1/public/demo")
@Tag(name = "Demo Seeding", description = "Endpoints for seeding realistic club demo data")
public class DemoSeedController {

    private final RealisticDemoDataSeeder seeder;

    public DemoSeedController(RealisticDemoDataSeeder seeder) {
        this.seeder = seeder;
    }

    @PostMapping("/seed")
    @Operation(summary = "Seed realistic demo data across all club modules")
    public ResponseEntity<Map<String, Object>> seedDemoData(
            @RequestParam(name = "force", defaultValue = "false") boolean force
    ) {
        Map<String, Object> result = seeder.seedAllDemoData(force);
        return ResponseEntity.ok(result);
    }
}
