package com.championsclub.bar.api;

import com.championsclub.bar.domain.KitchenTicketStatus;
import com.championsclub.bar.domain.TabItemStatus;
import com.championsclub.bar.dto.KitchenTicketDto;
import com.championsclub.bar.dto.KitchenTicketItemDto;
import com.championsclub.bar.dto.UpdateItemStatusRequest;
import com.championsclub.bar.service.KitchenDisplayService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/bar/kitchen-display", "/api/bar/kitchen-display"})
@RequiredArgsConstructor
@Tag(name = "Kitchen Display System", description = "Realtime SSE order stream, prep stations, timers, and bump bar")
public class KitchenDisplayController {

    private final KitchenDisplayService kdsService;

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Realtime Server-Sent Events stream for Kitchen and Bar prep displays")
    public SseEmitter streamOrders(
            @RequestParam(required = false, defaultValue = "ALL") String station
    ) {
        return kdsService.registerEmitter(station);
    }

    @GetMapping("/tickets")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'BAR_STAFF', 'KITCHEN')")
    @Operation(summary = "Get all active kitchen and bar tickets with elapsed timers")
    public ResponseEntity<List<KitchenTicketDto>> getActiveTickets(
            @RequestParam(required = false, defaultValue = "ALL") String station
    ) {
        return ResponseEntity.ok(kdsService.getActiveTickets(station));
    }

    @PatchMapping("/tickets/{id}/status")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'BAR_STAFF', 'KITCHEN')")
    @Operation(summary = "Update ticket status (e.g. mark PREPARING, READY, or COMPLETED)")
    public ResponseEntity<KitchenTicketDto> updateTicketStatus(
            @PathVariable UUID id,
            @RequestParam KitchenTicketStatus status
    ) {
        return ResponseEntity.ok(kdsService.updateTicketStatus(id, status));
    }

    @PatchMapping("/items/{id}/status")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'BAR_STAFF', 'KITCHEN')")
    @Operation(summary = "Update individual ticket item status (NEW -> PREPARING -> READY -> SERVED)")
    public ResponseEntity<KitchenTicketItemDto> updateItemStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateItemStatusRequest request
    ) {
        return ResponseEntity.ok(kdsService.updateItemStatus(id, request.getStatus()));
    }
}
