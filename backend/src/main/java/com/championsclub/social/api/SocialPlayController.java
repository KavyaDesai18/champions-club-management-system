package com.championsclub.social.api;

import com.championsclub.member.domain.User;
import com.championsclub.social.domain.AttendanceStatus;
import com.championsclub.social.domain.SocialSessionStatus;
import com.championsclub.social.dto.*;
import com.championsclub.social.service.SocialPlayService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@Tag(name = "Social Play Sessions", description = "Endpoints for Friday Social Play mixers, open round-robins, attendance, and admin scheduling")
public class SocialPlayController {

    private final SocialPlayService socialPlayService;

    public SocialPlayController(SocialPlayService socialPlayService) {
        this.socialPlayService = socialPlayService;
    }

    @GetMapping({"/social-sessions", "/api/v1/social-sessions"})
    @Operation(summary = "List upcoming social play sessions", description = "Returns scheduled mixers with capacity and spots remaining")
    public ResponseEntity<List<SocialSessionResponse>> getSessions(
            @RequestParam(required = false) UUID sportId,
            @RequestParam(required = false) UUID courtId,
            @RequestParam(required = false) SocialSessionStatus status,
            @RequestParam(required = false) Instant start,
            @RequestParam(required = false) Instant end
    ) {
        return ResponseEntity.ok(socialPlayService.getUpcomingSessions(sportId, courtId, status, start, end));
    }

    @GetMapping({"/social-sessions/{id}", "/api/v1/social-sessions/{id}"})
    @Operation(summary = "Get social play session details", description = "Returns session metadata and confirmed/waitlisted participants")
    public ResponseEntity<SocialSessionResponse> getSessionById(@PathVariable UUID id) {
        return ResponseEntity.ok(socialPlayService.getSessionById(id));
    }

    @PostMapping({"/social-sessions", "/api/v1/social-sessions"})
    @Operation(summary = "Create social play session or recurring series", description = "Admin endpoint that locks the court via booking block")
    public ResponseEntity<List<SocialSessionResponse>> createSession(
            @Valid @RequestBody CreateSocialSessionRequest request,
            Authentication authentication
    ) {
        User caller = extractUser(authentication);
        UUID creatorId = caller != null ? caller.getId() : null;
        List<SocialSessionResponse> responses = socialPlayService.createSession(request, creatorId);
        return ResponseEntity.status(HttpStatus.CREATED).body(responses);
    }

    @PutMapping({"/social-sessions/{id}", "/api/v1/social-sessions/{id}"})
    @Operation(summary = "Edit social session occurrence or series", description = "Updates metadata for a single session or all future occurrences in series")
    public ResponseEntity<SocialSessionResponse> updateSession(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateSocialSessionRequest request
    ) {
        return ResponseEntity.ok(socialPlayService.updateSession(id, request));
    }

    @PostMapping({"/social-sessions/{id}/cancel", "/api/v1/social-sessions/{id}/cancel"})
    @Operation(summary = "Cancel social session or series", description = "Frees the court block, refunds participants, and dispatches cancel notices")
    public ResponseEntity<Void> cancelSession(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "false") boolean cancelWholeSeries,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String reason = body != null ? body.get("reason") : null;
        socialPlayService.cancelSession(id, cancelWholeSeries, reason);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping({"/social-sessions/{id}", "/api/v1/social-sessions/{id}"})
    @Operation(summary = "Delete social session", description = "Cancels session and releases court")
    public ResponseEntity<Void> deleteSession(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "false") boolean cancelWholeSeries
    ) {
        socialPlayService.cancelSession(id, cancelWholeSeries, "Session deleted by staff");
        return ResponseEntity.noContent().build();
    }

    @PostMapping({"/social-sessions/{id}/join", "/api/v1/social-sessions/{id}/join"})
    @Operation(summary = "Join social session", description = "Atomic join with capacity enforcement; moves to waitlist if full")
    public ResponseEntity<SocialParticipantResponse> joinSession(
            @PathVariable UUID id,
            @RequestBody(required = false) JoinSocialSessionRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            Authentication authentication
    ) {
        JoinSocialSessionRequest effectiveRequest = request != null ? request : new JoinSocialSessionRequest();
        User caller = extractUser(authentication);
        UUID requestingUserId = caller != null ? caller.getId() : null;

        SocialParticipantResponse response = socialPlayService.joinSession(id, effectiveRequest, requestingUserId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping({"/social-sessions/{id}/leave", "/api/v1/social-sessions/{id}/leave"})
    @Operation(summary = "Leave social session", description = "Cancels registration, triggers refund if >2h before start, auto-promotes waitlist")
    public ResponseEntity<Void> leaveSession(
            @PathVariable UUID id,
            @RequestParam UUID participantId,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            Authentication authentication
    ) {
        User caller = extractUser(authentication);
        UUID requestingUserId = caller != null ? caller.getId() : null;
        socialPlayService.leaveSession(id, participantId, requestingUserId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping({"/social-sessions/{id}/attendance", "/api/v1/social-sessions/{id}/attendance"})
    @Operation(summary = "Mark attendance", description = "Staff check-off screen marking player ATTENDED or ABSENT")
    public ResponseEntity<SocialParticipantResponse> markAttendance(
            @PathVariable UUID id,
            @Valid @RequestBody AttendanceUpdateRequest request
    ) {
        return ResponseEntity.ok(socialPlayService.markAttendance(id, request));
    }

    private User extractUser(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return user;
        }
        return null;
    }
}
