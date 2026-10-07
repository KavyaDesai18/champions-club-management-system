package com.championsclub.court.api;

import com.championsclub.court.dto.AvailabilityResponse;
import com.championsclub.court.dto.HoldSlotRequest;
import com.championsclub.court.dto.HoldSlotResponse;
import com.championsclub.court.service.AvailabilityService;
import com.championsclub.court.service.AvailabilitySseHub;
import com.championsclub.member.domain.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@Tag(name = "Availability Engine", description = "Real-time court availability, slot generation, and SSE updates")
public class AvailabilityController {

    private final AvailabilityService availabilityService;
    private final AvailabilitySseHub sseHub;

    public AvailabilityController(AvailabilityService availabilityService, AvailabilitySseHub sseHub) {
        this.availabilityService = availabilityService;
        this.sseHub = sseHub;
    }

    @GetMapping({"/availability", "/api/v1/availability"})
    @Operation(summary = "Get court availability grid",
            description = "Returns slot states (AVAILABLE/BOOKED/HELD/BLOCKED/PAST/SOCIAL) and member pricing without N+1 queries, cached for 5s")
    public ResponseEntity<AvailabilityResponse> getAvailability(
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(value = "sportId", required = false) UUID sportId,
            @RequestParam(value = "courtId", required = false) UUID courtId,
            @RequestParam(value = "userId", required = false) UUID userId,
            Authentication authentication
    ) {
        UUID effectiveUserId = userId;
        if (effectiveUserId == null && authentication != null && authentication.getPrincipal() instanceof User authenticatedUser) {
            effectiveUserId = authenticatedUser.getId();
        }

        AvailabilityResponse response = availabilityService.getAvailability(date, sportId, courtId, effectiveUserId);
        return ResponseEntity.ok(response);
    }

    @GetMapping(value = {"/availability/stream", "/api/v1/availability/stream"}, produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Subscribe to live availability SSE stream",
            description = "Server-sent events connection that broadcasts slot updates in real time")
    public SseEmitter streamAvailability(
            @RequestParam(value = "date", required = false) String date,
            @RequestParam(value = "sportId", required = false) String sportId
    ) {
        String channel = (date != null && !date.isBlank()) ? date : "all";
        return sseHub.subscribe(channel);
    }

    @PostMapping({"/availability/hold", "/api/v1/availability/hold"})
    @Operation(summary = "Hold a court slot temporarily",
            description = "Places a 5-minute checkout lock on a slot")
    public ResponseEntity<HoldSlotResponse> holdSlot(
            @Valid @RequestBody HoldSlotRequest request,
            Authentication authentication
    ) {
        if (request.getUserId() == null && authentication != null && authentication.getPrincipal() instanceof User authenticatedUser) {
            request.setUserId(authenticatedUser.getId());
        }
        HoldSlotResponse response = availabilityService.holdSlot(request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping({"/availability/hold/{holdToken}", "/api/v1/availability/hold/{holdToken}"})
    @Operation(summary = "Release a held court slot")
    public ResponseEntity<Void> releaseHold(@PathVariable String holdToken) {
        availabilityService.releaseHold(holdToken);
        return ResponseEntity.noContent().build();
    }
}
