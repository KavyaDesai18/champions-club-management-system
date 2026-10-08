package com.championsclub.shop.service;

import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.member.domain.User;
import com.championsclub.shop.domain.*;
import com.championsclub.shop.dto.*;
import com.championsclub.shop.exception.InsufficientStockException;
import com.championsclub.shop.repo.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryService {

    private final InventoryRepository inventoryRepository;
    private final StockMovementRepository stockMovementRepository;
    private final ProductVariantRepository variantRepository;
    private final LowStockAlertRepository lowStockAlertRepository;
    private final ShopSseHub shopSseHub;

    /**
     * Deducts stock for a direct point-of-sale or online sale.
     * Guaranteed atomic: UPDATE inventory WHERE on_hand - reserved >= :qty
     */
    @Transactional
    public StockMovement deductStockForSale(UUID variantId, int qty, String reference, String reason, User createdBy) {
        if (qty <= 0) {
            throw new BusinessValidationException("Sale quantity must be greater than zero", "INVALID_SALE_QUANTITY");
        }
        if (qty > 100_000) {
            throw new BusinessValidationException("Sale quantity exceeds maximum allowable threshold", "EXCESSIVE_QUANTITY");
        }

        ProductVariant variant = getActiveVariant(variantId);

        // Atomic decrement at DB level
        int updated = inventoryRepository.atomicDeductOnHand(variantId, qty);
        if (updated == 0) {
            Inventory inv = inventoryRepository.findByVariantId(variantId).orElse(null);
            int available = (inv != null) ? inv.getAvailable() : 0;
            throw new InsufficientStockException("Insufficient stock for variant " + variant.getSku() +
                    ". Available: " + available + ", requested: " + qty);
        }

        // Write append-only ledger movement (qty is negative for sales to satisfy ledger invariant: SUM(qty) == on_hand)
        StockMovement movement = StockMovement.builder()
                .variant(variant)
                .type(StockMovementType.SALE)
                .qty(-qty)
                .reference(reference)
                .reason(reason != null ? reason : "Direct sales checkout")
                .createdBy(createdBy)
                .build();
        StockMovement savedMovement = stockMovementRepository.save(movement);

        // Check low-stock alert condition
        checkAndTriggerLowStockAlert(variant);

        return savedMovement;
    }

    /**
     * Reserves stock (e.g. For checkout hold, cart hold, or job ticket loan).
     * Guaranteed atomic: UPDATE inventory SET reserved = reserved + :qty WHERE on_hand - reserved >= :qty
     */
    @Transactional
    public StockMovement reserveStock(UUID variantId, int qty, String reference, String reason, User createdBy) {
        if (qty <= 0) {
            throw new BusinessValidationException("Reservation quantity must be greater than zero", "INVALID_RESERVE_QUANTITY");
        }

        ProductVariant variant = getActiveVariant(variantId);

        int updated = inventoryRepository.atomicReserve(variantId, qty);
        if (updated == 0) {
            Inventory inv = inventoryRepository.findByVariantId(variantId).orElse(null);
            int available = (inv != null) ? inv.getAvailable() : 0;
            throw new InsufficientStockException("Cannot reserve " + qty + " units of " + variant.getSku() +
                    ". Available: " + available);
        }

        // Ledger entry (qty = 0 on_hand delta, preserving ledger on_hand sum invariant)
        StockMovement movement = StockMovement.builder()
                .variant(variant)
                .type(StockMovementType.RESERVE)
                .qty(0)
                .reference(reference)
                .reason(reason != null ? reason : "Stock reservation")
                .createdBy(createdBy)
                .build();
        StockMovement savedMovement = stockMovementRepository.save(movement);

        checkAndTriggerLowStockAlert(variant);

        return savedMovement;
    }

    /**
     * Releases reserved stock (e.g. Expired cart, cancelled hold).
     * Guaranteed atomic: UPDATE inventory SET reserved = reserved - :qty WHERE reserved >= :qty
     */
    @Transactional
    public StockMovement releaseReservedStock(UUID variantId, int qty, String reference, String reason, User createdBy) {
        if (qty <= 0) {
            throw new BusinessValidationException("Release quantity must be greater than zero", "INVALID_RELEASE_QUANTITY");
        }

        ProductVariant variant = getActiveVariant(variantId);

        int updated = inventoryRepository.atomicRelease(variantId, qty);
        if (updated == 0) {
            throw new BusinessValidationException("Cannot release more reserved units than currently held", "RELEASE_EXCEEDS_RESERVED");
        }

        StockMovement movement = StockMovement.builder()
                .variant(variant)
                .type(StockMovementType.RELEASE)
                .qty(0)
                .reference(reference)
                .reason(reason != null ? reason : "Release reserved stock")
                .createdBy(createdBy)
                .build();
        StockMovement savedMovement = stockMovementRepository.save(movement);

        resolveLowStockAlertIfReplenished(variant);

        return savedMovement;
    }

    /**
     * Fulfills a previously reserved item into a completed sale.
     * Decrements on_hand and reserved concurrently.
     */
    @Transactional
    public StockMovement fulfillReservedSale(UUID variantId, int qty, String reference, String reason, User createdBy) {
        if (qty <= 0) {
            throw new BusinessValidationException("Fulfillment quantity must be greater than zero", "INVALID_QTY");
        }

        ProductVariant variant = getActiveVariant(variantId);

        int updated = inventoryRepository.atomicFulfillReservedSale(variantId, qty);
        if (updated == 0) {
            throw new InsufficientStockException("Cannot fulfill reserved sale for " + variant.getSku());
        }

        StockMovement movement = StockMovement.builder()
                .variant(variant)
                .type(StockMovementType.SALE)
                .qty(-qty)
                .reference(reference)
                .reason(reason != null ? reason : "Reserved order fulfillment")
                .createdBy(createdBy)
                .build();
        StockMovement savedMovement = stockMovementRepository.save(movement);

        checkAndTriggerLowStockAlert(variant);

        return savedMovement;
    }

    /**
     * Restock via purchase receipt or PO receiving.
     * Atomic addition to on_hand and auto-calculation of weighted average cost.
     */
    @Transactional
    public StockMovement restock(UUID variantId, int qty, BigDecimal unitCost, String reference, String reason, User createdBy) {
        if (qty <= 0) {
            throw new BusinessValidationException("Restock quantity must be positive", "INVALID_RESTOCK_QUANTITY");
        }
        if (qty > 100_000) {
            throw new BusinessValidationException("Restock quantity exceeds maximum threshold", "EXCESSIVE_QUANTITY");
        }

        ProductVariant variant = getActiveVariant(variantId);
        Inventory inv = inventoryRepository.findByVariantId(variantId)
                .orElseGet(() -> inventoryRepository.save(Inventory.builder()
                        .variant(variant)
                        .variantId(variantId)
                        .onHand(0)
                        .reserved(0)
                        .build()));

        int oldOnHand = inv.getOnHand();

        // Update weighted average cost (WAC) if unitCost provided
        if (unitCost != null && unitCost.compareTo(BigDecimal.ZERO) >= 0) {
            BigDecimal currentCost = variant.getCostPrice() != null ? variant.getCostPrice() : BigDecimal.ZERO;
            int totalUnits = oldOnHand + qty;
            if (totalUnits > 0) {
                BigDecimal oldTotal = currentCost.multiply(BigDecimal.valueOf(oldOnHand));
                BigDecimal newTotal = unitCost.multiply(BigDecimal.valueOf(qty));
                BigDecimal wac = oldTotal.add(newTotal).divide(BigDecimal.valueOf(totalUnits), 2, RoundingMode.HALF_UP);
                variant.setCostPrice(wac);
                variantRepository.save(variant);
            }
        }

        // Atomic addition
        inventoryRepository.atomicAddOnHand(variantId, qty);

        // Ledger movement
        StockMovement movement = StockMovement.builder()
                .variant(variant)
                .type(StockMovementType.PURCHASE)
                .qty(qty)
                .reference(reference)
                .reason(reason != null ? reason : "Purchase receipt restock")
                .createdBy(createdBy)
                .build();
        StockMovement savedMovement = stockMovementRepository.save(movement);

        resolveLowStockAlertIfReplenished(variant);

        // Broadcast restock event to staff
        shopSseHub.broadcastEvent("RESTOCK", Map.of(
                "variantId", variantId,
                "sku", variant.getSku(),
                "qtyAdded", qty,
                "newOnHand", oldOnHand + qty
        ));

        return savedMovement;
    }

    /**
     * Customer return restock.
     */
    @Transactional
    public StockMovement returnItem(UUID variantId, int qty, String reference, String reason, User createdBy) {
        if (qty <= 0) {
            throw new BusinessValidationException("Return quantity must be positive", "INVALID_RETURN_QUANTITY");
        }

        ProductVariant variant = getActiveVariant(variantId);
        inventoryRepository.atomicAddOnHand(variantId, qty);

        StockMovement movement = StockMovement.builder()
                .variant(variant)
                .type(StockMovementType.RETURN)
                .qty(qty)
                .reference(reference)
                .reason(reason != null ? reason : "Customer return")
                .createdBy(createdBy)
                .build();
        StockMovement savedMovement = stockMovementRepository.save(movement);

        resolveLowStockAlertIfReplenished(variant);

        return savedMovement;
    }

    /**
     * Stock adjustment with mandatory reason (Cycle count reconciliation).
     */
    @Transactional
    public StockMovement adjustStock(UUID variantId, int physicalCount, String reason, String reference, User createdBy) {
        if (reason == null || reason.trim().isEmpty()) {
            throw new BusinessValidationException("Stock adjustment reason is mandatory", "MISSING_ADJUSTMENT_REASON");
        }
        if (physicalCount < 0) {
            throw new BusinessValidationException("Physical stock count cannot be negative", "NEGATIVE_STOCK_ATTEMPT");
        }

        ProductVariant variant = getActiveVariant(variantId);
        Inventory inv = inventoryRepository.findByVariantId(variantId)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory record not found for variant " + variantId));

        int currentOnHand = inv.getOnHand();
        int delta = physicalCount - currentOnHand;

        if (delta == 0) {
            throw new BusinessValidationException("Stock count is already identical to current on_hand quantity (" +
                    currentOnHand + "); no adjustment required", "IDENTICAL_STOCK_ADJUSTMENT");
        }

        if (physicalCount < inv.getReserved()) {
            throw new BusinessValidationException("Cannot adjust on-hand count (" + physicalCount +
                    ") below currently reserved quantity (" + inv.getReserved() + ")", "BELOW_RESERVED_STOCK");
        }

        // Atomic update to exact physical count
        int updated = inventoryRepository.atomicReconcileOnHand(variantId, physicalCount);
        if (updated == 0) {
            throw new BusinessValidationException("Adjustment failed due to concurrent reservation lock", "ADJUSTMENT_CONFLICT");
        }

        // Write movement with delta
        StockMovement movement = StockMovement.builder()
                .variant(variant)
                .type(StockMovementType.ADJUSTMENT)
                .qty(delta)
                .reference(reference != null ? reference : "CYCLE-COUNT-AUDIT")
                .reason(reason.trim())
                .createdBy(createdBy)
                .build();
        StockMovement savedMovement = stockMovementRepository.save(movement);

        int newAvailable = physicalCount - inv.getReserved();
        if (newAvailable <= variant.getReorderLevel()) {
            checkAndTriggerLowStockAlert(variant);
        } else {
            resolveLowStockAlertIfReplenished(variant);
        }

        return savedMovement;
    }

    /**
     * Multi-item cycle count reconciliation.
     */
    @Transactional
    public List<StockMovementResponse> reconcileCycleCount(List<CycleCountReconcileRequest.ReconcileItemDto> items, User createdBy) {
        return items.stream().map(item -> {
            StockMovement movement = adjustStock(item.getVariantId(), item.getPhysicalCount(), item.getReason(), "CYCLE-COUNT-BATCH", createdBy);
            return mapMovementToResponse(movement);
        }).collect(Collectors.toList());
    }

    /**
     * Movement history timeline for a variant.
     */
    @Transactional(readOnly = true)
    public Page<StockMovementResponse> getMovementHistory(UUID variantId, Pageable pageable) {
        return stockMovementRepository.findByVariantIdOrderByCreatedAtDesc(variantId, pageable)
                .map(this::mapMovementToResponse);
    }

    /**
     * Recent movements across all variants.
     */
    @Transactional(readOnly = true)
    public Page<StockMovementResponse> getAllRecentMovements(Pageable pageable) {
        return stockMovementRepository.findAllRecent(pageable).map(this::mapMovementToResponse);
    }

    /**
     * List all active low stock alerts.
     */
    @Transactional(readOnly = true)
    public List<LowStockAlertResponse> getActiveLowStockAlerts() {
        return lowStockAlertRepository.findAllActive().stream()
                .map(this::mapAlertToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Core Invariant Assertion:
     * Returns true if sum of stock_movements qty equals inventory on_hand.
     */
    @Transactional(readOnly = true)
    public boolean assertLedgerInvariant(UUID variantId) {
        Inventory inv = inventoryRepository.findByVariantId(variantId).orElse(null);
        int onHand = (inv != null) ? inv.getOnHand() : 0;
        int ledgerSum = stockMovementRepository.sumQtyByVariantId(variantId);
        return ledgerSum == onHand;
    }

    /**
     * Get ledger sum for variant.
     */
    @Transactional(readOnly = true)
    public int getLedgerSum(UUID variantId) {
        return stockMovementRepository.sumQtyByVariantId(variantId);
    }

    /**
     * Get available stock for variant.
     */
    @Transactional(readOnly = true)
    public int getAvailableStock(UUID variantId) {
        return inventoryRepository.findByVariantId(variantId)
                .map(Inventory::getAvailable)
                .orElse(0);
    }

    public StockStatus computeStockStatus(int available, int reorderLevel) {
        if (available <= 0) {
            return StockStatus.OUT_OF_STOCK;
        } else if (available <= reorderLevel) {
            return StockStatus.LOW_STOCK;
        } else {
            return StockStatus.IN_STOCK;
        }
    }

    // --- Private Helper Methods ---

    private ProductVariant getActiveVariant(UUID variantId) {
        return variantRepository.findByIdAndIsDeletedFalse(variantId)
                .orElseThrow(() -> new ResourceNotFoundException("Product variant not found: " + variantId));
    }

    private void checkAndTriggerLowStockAlert(ProductVariant variant) {
        Inventory inv = inventoryRepository.findByVariantId(variant.getId()).orElse(null);
        if (inv == null) return;

        int available = inv.getAvailable();
        if (available <= variant.getReorderLevel()) {
            // Check if active alert already exists ("create alert (once until restocked)")
            if (lowStockAlertRepository.findByVariantIdAndStatus(variant.getId(), LowStockAlertStatus.ACTIVE).isEmpty()) {
                LowStockAlert alert = LowStockAlert.builder()
                        .variant(variant)
                        .currentAvailable(available)
                        .reorderLevel(variant.getReorderLevel())
                        .reorderQty(variant.getReorderQty())
                        .status(LowStockAlertStatus.ACTIVE)
                        .build();
                lowStockAlertRepository.save(alert);

                // Push SSE alert to staff
                Map<String, Object> payload = new HashMap<>();
                payload.put("alertId", alert.getId() != null ? alert.getId() : UUID.randomUUID());
                payload.put("variantId", variant.getId());
                payload.put("sku", variant.getSku());
                payload.put("productName", variant.getProduct() != null ? variant.getProduct().getName() : "");
                payload.put("available", available);
                payload.put("reorderLevel", variant.getReorderLevel());
                payload.put("reorderQty", variant.getReorderQty());
                shopSseHub.broadcastEvent("LOW_STOCK_ALERT", payload);
            }
        }
    }

    private void resolveLowStockAlertIfReplenished(ProductVariant variant) {
        Inventory inv = inventoryRepository.findByVariantId(variant.getId()).orElse(null);
        if (inv == null) return;

        int available = inv.getAvailable();
        if (available > variant.getReorderLevel()) {
            lowStockAlertRepository.findByVariantIdAndStatus(variant.getId(), LowStockAlertStatus.ACTIVE)
                    .ifPresent(alert -> {
                        alert.setStatus(LowStockAlertStatus.RESOLVED);
                        alert.setResolvedAt(Instant.now());
                        lowStockAlertRepository.save(alert);

                        Map<String, Object> payload = new HashMap<>();
                        payload.put("alertId", alert.getId() != null ? alert.getId() : UUID.randomUUID());
                        payload.put("variantId", variant.getId());
                        payload.put("sku", variant.getSku());
                        payload.put("newAvailable", available);
                        shopSseHub.broadcastEvent("ALERT_RESOLVED", payload);
                    });
        }
    }

    private StockMovementResponse mapMovementToResponse(StockMovement sm) {
        return StockMovementResponse.builder()
                .id(sm.getId())
                .variantId(sm.getVariant().getId())
                .variantSku(sm.getVariant().getSku())
                .productName(sm.getVariant().getProduct() != null ? sm.getVariant().getProduct().getName() : "")
                .type(sm.getType())
                .qty(sm.getQty())
                .reference(sm.getReference())
                .reason(sm.getReason())
                .createdBy(sm.getCreatedBy() != null ? sm.getCreatedBy().getFullName() : "SYSTEM")
                .createdAt(sm.getCreatedAt())
                .build();
    }

    private LowStockAlertResponse mapAlertToResponse(LowStockAlert a) {
        ProductVariant v = a.getVariant();
        Product p = v.getProduct();
        return LowStockAlertResponse.builder()
                .id(a.getId())
                .variantId(v.getId())
                .variantSku(v.getSku())
                .productName(p != null ? p.getName() : "")
                .brand(p != null ? p.getBrand() : "")
                .size(v.getSize())
                .color(v.getColor())
                .currentAvailable(a.getCurrentAvailable())
                .reorderLevel(a.getReorderLevel())
                .reorderQty(a.getReorderQty())
                .status(a.getStatus())
                .createdAt(a.getCreatedAt())
                .resolvedAt(a.getResolvedAt())
                .build();
    }
}
