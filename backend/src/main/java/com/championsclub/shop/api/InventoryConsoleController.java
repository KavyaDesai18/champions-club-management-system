package com.championsclub.shop.api;

import com.championsclub.member.domain.User;
import com.championsclub.shop.domain.StockMovement;
import com.championsclub.shop.dto.*;
import com.championsclub.shop.service.InventoryService;
import com.championsclub.shop.service.ShopCatalogService;
import com.championsclub.shop.service.ShopSseHub;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/shop/inventory")
@RequiredArgsConstructor
@Tag(name = "Inventory Operations", description = "Stock restock, cycle counts, adjustments, ledger timeline, and low-stock alerts")
public class InventoryConsoleController {

    private final InventoryService inventoryService;
    private final ShopCatalogService shopCatalogService;
    private final ShopSseHub shopSseHub;

    @GetMapping("/variants")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'SHOP_STAFF', 'FRONT_DESK')")
    @Operation(summary = "Get all active variants with real-time stock levels")
    public ResponseEntity<List<CatalogProductResponse.VariantDto>> getAllVariants() {
        return ResponseEntity.ok(shopCatalogService.getAllVariants(true));
    }

    @PostMapping("/{variantId}/restock")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'SHOP_STAFF')")
    @Operation(summary = "Restock variant stock via purchase receipt")
    public ResponseEntity<StockMovementResponse> restock(
            @PathVariable UUID variantId,
            @Valid @RequestBody RestockRequest request,
            Authentication authentication
    ) {
        User user = extractUser(authentication);
        StockMovement movement = inventoryService.restock(
                variantId,
                request.getQty(),
                request.getUnitCost(),
                request.getReference() != null ? request.getReference() : "PURCHASE-RECEIPT",
                request.getReason(),
                user
        );

        return ResponseEntity.ok(StockMovementResponse.builder()
                .id(movement.getId())
                .variantId(movement.getVariant().getId())
                .variantSku(movement.getVariant().getSku())
                .productName(movement.getVariant().getProduct() != null ? movement.getVariant().getProduct().getName() : "")
                .type(movement.getType())
                .qty(movement.getQty())
                .reference(movement.getReference())
                .reason(movement.getReason())
                .createdBy(user != null ? user.getFullName() : "STAFF")
                .createdAt(movement.getCreatedAt())
                .build());
    }

    @PostMapping("/{variantId}/adjust")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'SHOP_STAFF')")
    @Operation(summary = "Adjust physical stock count with mandatory audit reason")
    public ResponseEntity<StockMovementResponse> adjustStock(
            @PathVariable UUID variantId,
            @Valid @RequestBody StockAdjustmentRequest request,
            Authentication authentication
    ) {
        User user = extractUser(authentication);
        StockMovement movement = inventoryService.adjustStock(
                variantId,
                request.getPhysicalCount(),
                request.getReason(),
                request.getReference(),
                user
        );

        return ResponseEntity.ok(StockMovementResponse.builder()
                .id(movement.getId())
                .variantId(movement.getVariant().getId())
                .variantSku(movement.getVariant().getSku())
                .productName(movement.getVariant().getProduct() != null ? movement.getVariant().getProduct().getName() : "")
                .type(movement.getType())
                .qty(movement.getQty())
                .reference(movement.getReference())
                .reason(movement.getReason())
                .createdBy(user != null ? user.getFullName() : "STAFF")
                .createdAt(movement.getCreatedAt())
                .build());
    }

    @PostMapping("/reconcile")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'SHOP_STAFF')")
    @Operation(summary = "Batch cycle-count inventory audit reconcile")
    public ResponseEntity<List<StockMovementResponse>> reconcileCycleCount(
            @Valid @RequestBody CycleCountReconcileRequest request,
            Authentication authentication
    ) {
        User user = extractUser(authentication);
        return ResponseEntity.ok(inventoryService.reconcileCycleCount(request.getItems(), user));
    }

    @GetMapping("/{variantId}/movements")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'SHOP_STAFF')")
    @Operation(summary = "Get append-only ledger movement history for a variant")
    public ResponseEntity<Page<StockMovementResponse>> getMovementHistory(
            @PathVariable UUID variantId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)));
        return ResponseEntity.ok(inventoryService.getMovementHistory(variantId, pageable));
    }

    @GetMapping("/movements")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'SHOP_STAFF')")
    @Operation(summary = "Get recent stock movements across all variants")
    public ResponseEntity<Page<StockMovementResponse>> getAllRecentMovements(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size
    ) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)));
        return ResponseEntity.ok(inventoryService.getAllRecentMovements(pageable));
    }

    @GetMapping("/low-stock-alerts")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'SHOP_STAFF', 'FRONT_DESK')")
    @Operation(summary = "List all active low stock alerts")
    public ResponseEntity<List<LowStockAlertResponse>> getActiveAlerts() {
        return ResponseEntity.ok(inventoryService.getActiveLowStockAlerts());
    }

    @GetMapping("/{variantId}/ledger-invariant")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Verify ledger invariant", description = "Asserts that SUM(stock_movements.qty) == inventory.on_hand")
    public ResponseEntity<Map<String, Object>> verifyLedgerInvariant(@PathVariable UUID variantId) {
        boolean valid = inventoryService.assertLedgerInvariant(variantId);
        int sum = inventoryService.getLedgerSum(variantId);
        int available = inventoryService.getAvailableStock(variantId);

        return ResponseEntity.ok(Map.of(
                "variantId", variantId,
                "ledgerSum", sum,
                "availableStock", available,
                "invariantValid", valid
        ));
    }

    @GetMapping("/stream")
    @Operation(summary = "SSE live stream for staff inventory, low-stock, and job ticket events")
    public SseEmitter streamInventoryEvents(@RequestParam(defaultValue = "all") String channel) {
        return shopSseHub.subscribe(channel);
    }

    private User extractUser(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return user;
        }
        return null;
    }
}
