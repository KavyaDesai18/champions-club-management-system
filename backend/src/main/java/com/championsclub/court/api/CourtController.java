package com.championsclub.court.api;

import com.championsclub.court.dto.BookingResponse;
import com.championsclub.court.dto.CourtDto;
import com.championsclub.court.dto.CreateBookingRequest;
import com.championsclub.court.service.CourtBookingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Court & Booking Management", description = "Endpoints for court discovery and reservation")
public class CourtController {

    private final CourtBookingService courtBookingService;

    public CourtController(CourtBookingService courtBookingService) {
        this.courtBookingService = courtBookingService;
    }

    @GetMapping("/courts")
    @Operation(summary = "List all active courts", description = "Returns active courts across badminton, tennis, and squash")
    public ResponseEntity<List<CourtDto>> getAllCourts() {
        return ResponseEntity.ok(courtBookingService.getAllActiveCourts());
    }

    @PostMapping("/bookings")
    @Operation(summary = "Create court booking", description = "Books a 60-min court session with idempotency protection and exclusion guard")
    public ResponseEntity<BookingResponse> createBooking(
            @Valid @RequestBody CreateBookingRequest request,
            @Parameter(description = "Unique client-generated token preventing duplicate bookings")
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            HttpServletRequest servletRequest
    ) {
        String clientIp = servletRequest.getRemoteAddr();
        BookingResponse response = courtBookingService.createBooking(request, idempotencyKey, clientIp);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/bookings/user/{userId}")
    @Operation(summary = "Get user bookings", description = "Retrieves reservation history for a member or guest")
    public ResponseEntity<List<BookingResponse>> getUserBookings(@PathVariable UUID userId) {
        return ResponseEntity.ok(courtBookingService.getUserBookings(userId));
    }
}
