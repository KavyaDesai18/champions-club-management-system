package com.championsclub.shop.api;

import com.championsclub.member.domain.User;
import com.championsclub.shop.domain.OrderChannel;
import com.championsclub.shop.domain.OrderStatus;
import com.championsclub.shop.dto.*;
import com.championsclub.shop.service.ShopOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/shop/staff/orders")
@RequiredArgsConstructor
@Tag(name = "Staff Shop Order Operations", description = "Order queue board, POS counter quick sale, status advance, and refunds")
public class ShopStaffOrderController {

    private final ShopOrderService shopOrderService;

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'SHOP_STAFF', 'FRONT_DESK')")
    @Operation(summary = "Search and filter orders across channels and fulfilment types")
    public ResponseEntity<Page<OrderResponse>> getOrders(
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) OrderChannel channel,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(
                Math.max(0, page),
                Math.min(100, Math.max(1, size)),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
        return ResponseEntity.ok(shopOrderService.getOrders(status, channel, search, pageable));
    }

    @GetMapping("/queue")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'SHOP_STAFF', 'FRONT_DESK')")
    @Operation(summary = "Get active orders for staff fulfillment Kanban queue board")
    public ResponseEntity<List<OrderResponse>> getQueueOrders() {
        return ResponseEntity.ok(shopOrderService.getQueueOrders());
    }

    @PostMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'SHOP_STAFF', 'FRONT_DESK')")
    @Operation(summary = "Advance order status according to state machine rules")
    public ResponseEntity<OrderResponse> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody OrderStatusUpdateRequest request,
            Authentication authentication
    ) {
        User user = extractUser(authentication);
        OrderResponse response = shopOrderService.updateOrderStatus(id, request.getNewStatus(), request.getReason(), user);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/counter-sale")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'SHOP_STAFF', 'FRONT_DESK')")
    @Operation(summary = "Process instant Counter POS Quick Sale in under 3 taps")
    public ResponseEntity<OrderResponse> processCounterSale(
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyHeader,
            @Valid @RequestBody CounterOrderCreateRequest request,
            Authentication authentication
    ) {
        if (idempotencyHeader != null && !idempotencyHeader.isBlank() && request.getIdempotencyKey() == null) {
            request.setIdempotencyKey(idempotencyHeader.trim());
        }
        User user = extractUser(authentication);
        return ResponseEntity.ok(shopOrderService.createCounterSale(request, user));
    }

    @PostMapping("/{id}/refund")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'SHOP_STAFF')")
    @Operation(summary = "Refund order and return inventory items to ledger")
    public ResponseEntity<OrderResponse> refundOrder(
            @PathVariable UUID id,
            @Valid @RequestBody OrderRefundRequest request,
            Authentication authentication
    ) {
        User user = extractUser(authentication);
        return ResponseEntity.ok(shopOrderService.updateOrderStatus(id, OrderStatus.REFUNDED, request.getReason(), user));
    }

    private User extractUser(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return user;
        }
        return null;
    }
}
