package com.championsclub.shop.api;

import com.championsclub.member.domain.User;
import com.championsclub.shop.dto.ClubServiceDto;
import com.championsclub.shop.dto.ServiceJobTicketDto;
import com.championsclub.shop.service.ShopServiceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/shop")
@RequiredArgsConstructor
@Tag(name = "Club Services & Job Tickets", description = "Non-stock services: racket re-stringing, equipment rentals, ball-machine hire, and job tickets")
public class ShopServicesController {

    private final ShopServiceService shopServiceService;

    @GetMapping("/services")
    @Operation(summary = "List all active club services")
    public ResponseEntity<List<ClubServiceDto>> getServices() {
        return ResponseEntity.ok(shopServiceService.getAllActiveServices());
    }

    @GetMapping("/tickets")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'SHOP_STAFF', 'FRONT_DESK', 'MEMBER')")
    @Operation(summary = "List service job tickets")
    public ResponseEntity<List<ServiceJobTicketDto>> getTickets(@RequestParam(required = false) UUID memberId) {
        if (memberId != null) {
            return ResponseEntity.ok(shopServiceService.getTicketsByMember(memberId));
        }
        return ResponseEntity.ok(shopServiceService.getAllTickets());
    }

    @PostMapping("/tickets")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'SHOP_STAFF', 'FRONT_DESK')")
    @Operation(summary = "Create service job ticket (e.g. Racket re-stringing with optional loan racket)")
    public ResponseEntity<ServiceJobTicketDto> createTicket(
            @Valid @RequestBody ServiceJobTicketDto.CreateRequest request,
            Authentication authentication
    ) {
        User user = extractUser(authentication);
        return ResponseEntity.status(HttpStatus.CREATED).body(shopServiceService.createJobTicket(request, user));
    }

    @PatchMapping("/tickets/{id}/status")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'SHOP_STAFF', 'FRONT_DESK')")
    @Operation(summary = "Update ticket status (RECEIVED/IN_PROGRESS/READY/COMPLETED) and return loan gear")
    public ResponseEntity<ServiceJobTicketDto> updateTicketStatus(
            @PathVariable UUID id,
            @Valid @RequestBody ServiceJobTicketDto.UpdateStatusRequest request,
            Authentication authentication
    ) {
        User user = extractUser(authentication);
        return ResponseEntity.ok(shopServiceService.updateTicketStatus(id, request, user));
    }

    @GetMapping("/tickets/unreturned-loans")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'SHOP_STAFF', 'FRONT_DESK')")
    @Operation(summary = "List tickets with unreturned loan equipment")
    public ResponseEntity<List<ServiceJobTicketDto>> getUnreturnedLoans() {
        return ResponseEntity.ok(shopServiceService.getUnreturnedLoanTickets());
    }

    private User extractUser(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return user;
        }
        return null;
    }
}
