package com.championsclub.shop.service;

import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.member.domain.User;
import com.championsclub.shop.domain.*;
import com.championsclub.shop.dto.PurchaseOrderDto;
import com.championsclub.shop.repo.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PurchaseOrderService {

    private final PurchaseOrderRepository poRepository;
    private final PurchaseOrderItemRepository poItemRepository;
    private final SupplierRepository supplierRepository;
    private final SupplierBillRepository billRepository;
    private final ProductVariantRepository variantRepository;
    private final LowStockAlertRepository alertRepository;
    private final InventoryService inventoryService;

    private static final AtomicInteger PO_COUNTER = new AtomicInteger(100);
    private static final AtomicInteger BILL_COUNTER = new AtomicInteger(100);

    @Transactional(readOnly = true)
    public List<PurchaseOrderDto> getAllPurchaseOrders() {
        return poRepository.findAllRecent().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PurchaseOrderDto getPurchaseOrderById(UUID id) {
        PurchaseOrder po = poRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase Order not found: " + id));
        return mapToDto(po);
    }

    @Transactional
    public PurchaseOrderDto createPurchaseOrder(PurchaseOrderDto.CreateRequest request, User createdBy) {
        Supplier supplier = supplierRepository.findById(request.getSupplierId())
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found: " + request.getSupplierId()));

        String poNumber = "PO-" + LocalDate.now().getYear() + "-" + String.format("%04d", PO_COUNTER.incrementAndGet());

        PurchaseOrder po = PurchaseOrder.builder()
                .poNumber(poNumber)
                .supplier(supplier)
                .status(PurchaseOrderStatus.DRAFT)
                .notes(request.getNotes())
                .createdBy(createdBy)
                .build();

        BigDecimal totalCost = BigDecimal.ZERO;
        List<PurchaseOrderItem> items = new ArrayList<>();

        for (PurchaseOrderDto.CreateItemDto itemDto : request.getItems()) {
            ProductVariant variant = variantRepository.findByIdAndIsDeletedFalse(itemDto.getVariantId())
                    .orElseThrow(() -> new ResourceNotFoundException("Variant not found: " + itemDto.getVariantId()));

            BigDecimal itemTotal = itemDto.getUnitCost().multiply(BigDecimal.valueOf(itemDto.getOrderedQty()));
            totalCost = totalCost.add(itemTotal);

            PurchaseOrderItem item = PurchaseOrderItem.builder()
                    .purchaseOrder(po)
                    .variant(variant)
                    .orderedQty(itemDto.getOrderedQty())
                    .receivedQty(0)
                    .unitCost(itemDto.getUnitCost())
                    .totalCost(itemTotal)
                    .build();
            items.add(item);
        }

        po.setTotalCost(totalCost);
        po.setItems(items);

        PurchaseOrder savedPo = poRepository.save(po);
        return mapToDto(savedPo);
    }

    @Transactional
    public PurchaseOrderDto sendPurchaseOrder(UUID id) {
        PurchaseOrder po = poRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase Order not found: " + id));

        if (po.getStatus() != PurchaseOrderStatus.DRAFT) {
            throw new BusinessValidationException("Only DRAFT purchase orders can be sent", "INVALID_PO_STATUS");
        }

        po.setStatus(PurchaseOrderStatus.SENT);
        po.setSentAt(Instant.now());
        return mapToDto(poRepository.save(po));
    }

    /**
     * Receive items on a purchase order (partial receipts supported).
     * Auto-creates PURCHASE stock movements and a supplier bill.
     */
    @Transactional
    public PurchaseOrderDto receivePurchaseOrder(UUID id, PurchaseOrderDto.ReceiveRequest request, User receivedBy) {
        PurchaseOrder po = poRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase Order not found: " + id));

        if (po.getStatus() != PurchaseOrderStatus.SENT && po.getStatus() != PurchaseOrderStatus.PARTIALLY_RECEIVED) {
            throw new BusinessValidationException("PO must be in SENT or PARTIALLY_RECEIVED status to receive goods", "INVALID_PO_STATUS");
        }

        BigDecimal billAmount = BigDecimal.ZERO;
        int totalOrdered = 0;
        int totalReceived = 0;

        for (PurchaseOrderDto.ReceiveItemDto itemDto : request.getItems()) {
            PurchaseOrderItem item = poItemRepository.findById(itemDto.getPoItemId())
                    .orElseThrow(() -> new ResourceNotFoundException("PO Item not found: " + itemDto.getPoItemId()));

            if (!item.getPurchaseOrder().getId().equals(po.getId())) {
                throw new BusinessValidationException("Item does not belong to this purchase order", "PO_ITEM_MISMATCH");
            }

            int currentReceived = item.getReceivedQty() != null ? item.getReceivedQty() : 0;
            int newTotalReceived = currentReceived + itemDto.getReceivedQty();

            if (newTotalReceived > item.getOrderedQty()) {
                throw new BusinessValidationException("Cannot receive more units (" + newTotalReceived +
                        ") than ordered (" + item.getOrderedQty() + ") for variant " + item.getVariant().getSku(), "RECEIVE_EXCEEDS_ORDERED");
            }

            item.setReceivedQty(newTotalReceived);
            poItemRepository.save(item);

            BigDecimal receiptUnitCost = itemDto.getUnitCostOverride() != null ? itemDto.getUnitCostOverride() : item.getUnitCost();
            BigDecimal receiptCost = receiptUnitCost.multiply(BigDecimal.valueOf(itemDto.getReceivedQty()));
            billAmount = billAmount.add(receiptCost);

            // Auto-creates PURCHASE stock movement + updates on_hand and weighted average cost
            inventoryService.restock(
                    item.getVariant().getId(),
                    itemDto.getReceivedQty(),
                    receiptUnitCost,
                    po.getPoNumber(),
                    "Received against PO: " + po.getPoNumber(),
                    receivedBy
            );
        }

        // Re-evaluate overall PO status across all items
        for (PurchaseOrderItem item : po.getItems()) {
            totalOrdered += item.getOrderedQty();
            totalReceived += (item.getReceivedQty() != null ? item.getReceivedQty() : 0);
        }

        if (totalReceived >= totalOrdered) {
            po.setStatus(PurchaseOrderStatus.RECEIVED);
        } else {
            po.setStatus(PurchaseOrderStatus.PARTIALLY_RECEIVED);
        }

        PurchaseOrder updatedPo = poRepository.save(po);

        // Auto-create supplier bill feeding "what we owe" in P14
        if (billAmount.compareTo(BigDecimal.ZERO) > 0) {
            String billNumber = "BILL-" + LocalDate.now().getYear() + "-" + String.format("%04d", BILL_COUNTER.incrementAndGet());
            SupplierBill bill = SupplierBill.builder()
                    .billNumber(billNumber)
                    .purchaseOrder(po)
                    .supplier(po.getSupplier())
                    .amount(billAmount)
                    .status("UNPAID")
                    .dueDate(LocalDate.now().plusDays(30))
                    .notes("Generated from receipt of " + po.getPoNumber())
                    .build();
            billRepository.save(bill);
        }

        return mapToDto(updatedPo);
    }

    /**
     * One-click "reorder suggested" from low-stock alerts.
     * Takes all currently active low-stock alerts and drafts purchase orders grouped by supplier.
     */
    @Transactional
    public List<PurchaseOrderDto> generateSuggestedReorders(User createdBy) {
        List<LowStockAlert> activeAlerts = alertRepository.findAllActive();
        if (activeAlerts.isEmpty()) {
            return Collections.emptyList();
        }

        // Default preferred supplier if variant does not have specific vendor link
        Supplier defaultSupplier = supplierRepository.findByActiveTrueOrderByNameAsc().stream().findFirst()
                .orElseThrow(() -> new BusinessValidationException("No active suppliers found in system to generate PO", "NO_SUPPLIERS"));

        List<PurchaseOrderDto.CreateItemDto> itemsToOrder = new ArrayList<>();
        for (LowStockAlert alert : activeAlerts) {
            ProductVariant variant = alert.getVariant();
            BigDecimal cost = (variant.getCostPrice() != null && variant.getCostPrice().compareTo(BigDecimal.ZERO) > 0)
                    ? variant.getCostPrice()
                    : BigDecimal.valueOf(50.00);

            itemsToOrder.add(PurchaseOrderDto.CreateItemDto.builder()
                    .variantId(variant.getId())
                    .orderedQty(variant.getReorderQty())
                    .unitCost(cost)
                    .build());
        }

        PurchaseOrderDto.CreateRequest createReq = PurchaseOrderDto.CreateRequest.builder()
                .supplierId(defaultSupplier.getId())
                .notes("Auto-generated draft reorder from " + activeAlerts.size() + " active low-stock alerts")
                .items(itemsToOrder)
                .build();

        PurchaseOrderDto createdPo = createPurchaseOrder(createReq, createdBy);
        return List.of(createdPo);
    }

    private PurchaseOrderDto mapToDto(PurchaseOrder po) {
        List<PurchaseOrderDto.ItemDto> items = po.getItems().stream()
                .map(i -> PurchaseOrderDto.ItemDto.builder()
                        .id(i.getId())
                        .variantId(i.getVariant().getId())
                        .variantSku(i.getVariant().getSku())
                        .productName(i.getVariant().getProduct() != null ? i.getVariant().getProduct().getName() : "")
                        .orderedQty(i.getOrderedQty())
                        .receivedQty(i.getReceivedQty())
                        .unitCost(i.getUnitCost())
                        .totalCost(i.getTotalCost())
                        .build())
                .collect(Collectors.toList());

        return PurchaseOrderDto.builder()
                .id(po.getId())
                .poNumber(po.getPoNumber())
                .supplierId(po.getSupplier().getId())
                .supplierName(po.getSupplier().getName())
                .status(po.getStatus())
                .totalCost(po.getTotalCost())
                .notes(po.getNotes())
                .createdBy(po.getCreatedBy() != null ? po.getCreatedBy().getFullName() : "SYSTEM")
                .sentAt(po.getSentAt())
                .createdAt(po.getCreatedAt())
                .items(items)
                .build();
    }
}
