package com.championsclub.court.api;

import com.championsclub.court.domain.BookingStatus;
import com.championsclub.court.dto.BookingResponse;
import com.championsclub.court.dto.CancelBookingRequest;
import com.championsclub.court.dto.CourtDto;
import com.championsclub.court.dto.CreateBookingRequest;
import com.championsclub.court.dto.JoinWaitlistRequest;
import com.championsclub.court.dto.RescheduleRequest;
import com.championsclub.court.dto.WaitlistResponse;
import com.championsclub.court.service.CourtBookingService;
import com.championsclub.member.domain.User;
import com.championsclub.common.security.Role;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@Tag(name = "Booking Engine", description = "Endpoints for court reservations, slot holds, waitlist, and cancellations")
public class CourtController {

    private final CourtBookingService courtBookingService;

    public CourtController(CourtBookingService courtBookingService) {
        this.courtBookingService = courtBookingService;
    }

    @GetMapping({"/courts", "/api/v1/courts"})
    @Operation(summary = "List all active courts", description = "Returns active courts across badminton, tennis, and squash")
    public ResponseEntity<List<CourtDto>> getAllCourts() {
        return ResponseEntity.ok(courtBookingService.getAllActiveCourts());
    }

    @PostMapping({"/bookings", "/api/v1/bookings"})
    @Operation(summary = "Create court booking or slot hold", description = "Books a 60-min session or holds slot for 5 minutes with exclusion guard")
    public ResponseEntity<BookingResponse> createBooking(
            @Valid @RequestBody CreateBookingRequest request,
            @Parameter(description = "Unique client-generated token preventing duplicate bookings")
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            Authentication authentication,
            HttpServletRequest servletRequest
    ) {
        User caller = extractUser(authentication);
        String clientIp = servletRequest.getRemoteAddr();
        BookingResponse response = courtBookingService.createBooking(request, idempotencyKey, clientIp, caller);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping({"/bookings/{id}/confirm", "/api/v1/bookings/{id}/confirm"})
    @Operation(summary = "Confirm held booking", description = "Converts HELD slot to CONFIRMED before the 5-min TTL expires")
    public ResponseEntity<BookingResponse> confirmBooking(
            @PathVariable UUID id,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            Authentication authentication,
            HttpServletRequest servletRequest
    ) {
        User caller = extractUser(authentication);
        String clientIp = servletRequest.getRemoteAddr();
        BookingResponse response = courtBookingService.confirmBooking(id, idempotencyKey, clientIp, caller);
        return ResponseEntity.ok(response);
    }

    @PostMapping({"/bookings/{id}/cancel", "/api/v1/bookings/{id}/cancel"})
    @Operation(summary = "Cancel court booking", description = "Cancels a booking, frees slot instantly for GiST guard, and notifies waitlist")
    public ResponseEntity<BookingResponse> cancelBooking(
            @PathVariable UUID id,
            @RequestBody(required = false) CancelBookingRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            Authentication authentication,
            HttpServletRequest servletRequest
    ) {
        User caller = extractUser(authentication);
        String clientIp = servletRequest.getRemoteAddr();
        BookingResponse response = courtBookingService.cancelBooking(id, request, idempotencyKey, clientIp, caller);
        return ResponseEntity.ok(response);
    }

    @PostMapping({"/bookings/{id}/reschedule", "/api/v1/bookings/{id}/reschedule"})
    @Operation(summary = "Reschedule court booking", description = "Atomic cancel-and-rebook in a single database transaction")
    public ResponseEntity<BookingResponse> rescheduleBooking(
            @PathVariable UUID id,
            @Valid @RequestBody RescheduleRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            Authentication authentication,
            HttpServletRequest servletRequest
    ) {
        User caller = extractUser(authentication);
        String clientIp = servletRequest.getRemoteAddr();
        BookingResponse response = courtBookingService.rescheduleBooking(id, request, idempotencyKey, clientIp, caller);
        return ResponseEntity.ok(response);
    }

    @GetMapping({"/bookings/{id}", "/api/v1/bookings/{id}"})
    @Operation(summary = "Get booking by ID", description = "Retrieves reservation details")
    public ResponseEntity<BookingResponse> getBookingById(@PathVariable UUID id) {
        return ResponseEntity.ok(courtBookingService.getBookingById(id));
    }

    @GetMapping({"/bookings", "/api/v1/bookings"})
    @Operation(summary = "List bookings with filters", description = "Lists current user's bookings or all bookings with filter for staff")
    public ResponseEntity<List<BookingResponse>> getBookings(
            @RequestParam(value = "courtId", required = false) UUID courtId,
            @RequestParam(value = "status", required = false) BookingStatus status,
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(value = "mine", required = false, defaultValue = "false") boolean mineOnly,
            Authentication authentication
    ) {
        User caller = extractUser(authentication);
        boolean isStaff = caller != null && (caller.getRole() == Role.OWNER || caller.getRole() == Role.MANAGER || caller.getRole() == Role.FRONT_DESK);

        if (mineOnly || !isStaff) {
            if (caller == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            return ResponseEntity.ok(courtBookingService.getUserBookings(caller.getId()));
        }

        return ResponseEntity.ok(courtBookingService.listBookings(courtId, status, from, to));
    }

    @GetMapping({"/bookings/user/{userId}", "/api/v1/bookings/user/{userId}"})
    @Operation(summary = "Get user bookings", description = "Retrieves reservation history for a member or guest user")
    public ResponseEntity<List<BookingResponse>> getUserBookings(@PathVariable UUID userId) {
        return ResponseEntity.ok(courtBookingService.getUserBookings(userId));
    }

    @PostMapping({"/bookings/waitlist", "/api/v1/bookings/waitlist"})
    @Operation(summary = "Join slot waitlist", description = "Enters the FIFO queue for a booked court slot")
    public ResponseEntity<WaitlistResponse> joinWaitlist(
            @Valid @RequestBody JoinWaitlistRequest request,
            Authentication authentication
    ) {
        User caller = extractUser(authentication);
        WaitlistResponse response = courtBookingService.joinWaitlist(request, caller);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @DeleteMapping({"/bookings/waitlist/{id}", "/api/v1/bookings/waitlist/{id}"})
    @Operation(summary = "Leave slot waitlist", description = "Cancels waitlist entry")
    public ResponseEntity<Map<String, String>> leaveWaitlist(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        User caller = extractUser(authentication);
        courtBookingService.leaveWaitlist(id, caller);
        return ResponseEntity.ok(Map.of("message", "Removed from waitlist"));
    }

    @GetMapping({"/bookings/waitlist/mine", "/api/v1/bookings/waitlist/mine"})
    @Operation(summary = "List my waitlist entries", description = "Returns active waitlist entries for caller")
    public ResponseEntity<List<WaitlistResponse>> getMyWaitlist(Authentication authentication) {
        User caller = extractUser(authentication);
        if (caller == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(courtBookingService.getWaitlistForMember(caller.getId()));
    }

    @PostMapping({"/bookings/{id}/no-show", "/api/v1/bookings/{id}/no-show"})
    @Operation(summary = "Mark booking as NO_SHOW", description = "Staff action marking an unfulfilled reservation")
    public ResponseEntity<BookingResponse> markNoShow(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body,
            Authentication authentication,
            HttpServletRequest servletRequest
    ) {
        User caller = extractUser(authentication);
        String reason = body != null ? body.get("reason") : "Customer did not arrive";
        String clientIp = servletRequest.getRemoteAddr();
        BookingResponse response = courtBookingService.markNoShow(id, reason, clientIp, caller);
        return ResponseEntity.ok(response);
    }

    private User extractUser(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return user;
        }
        return null;
    }
}
