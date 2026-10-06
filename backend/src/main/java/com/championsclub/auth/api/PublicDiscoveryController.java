package com.championsclub.auth.api;

import com.championsclub.common.time.ClubTimeUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/public")
@Tag(name = "Public Discovery & Health", description = "Publicly accessible endpoints for health, club info, and discovery")
public class PublicDiscoveryController {

    private final ClubTimeUtils timeUtils;

    public PublicDiscoveryController(ClubTimeUtils timeUtils) {
        this.timeUtils = timeUtils;
    }

    @GetMapping("/health")
    @Operation(summary = "Application health status", description = "Returns system status, club timezone, and current UTC instant")
    public ResponseEntity<Map<String, Object>> getHealth() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "club", "Champions Club",
                "timezone", timeUtils.getClubZoneId().toString(),
                "serverTimeUtc", timeUtils.now().toString(),
                "clubDate", timeUtils.currentClubDate().toString()
        ));
    }
}
