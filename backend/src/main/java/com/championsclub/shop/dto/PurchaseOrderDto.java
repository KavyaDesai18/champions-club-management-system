package com.championsclub.shop.dto;

import com.championsclub.shop.domain.PurchaseOrderStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseOrderDto {

    private UUID id;
    private String poNumber;
    private UUID supplierId;
    private String supplierName;
    private PurchaseOrderStatus status;
    private BigDecimal totalCost;
    private String notes;
    private String createdBy;
    private Instant sentAt;
    private Instant createdAt;
    private List<ItemDto> items;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ItemDto {
        private UUID id;
        private UUID variantId;
        private String variantSku;
        private String productName;
        private Integer orderedQty;
        private Integer receivedQty;
        private BigDecimal unitCost;
        private BigDecimal totalCost;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateRequest {
        @NotNull(message = "Supplier ID is required")
        private UUID supplierId;
        private String notes;
        @NotEmpty(message = "Purchase order must have at least one item")
        @Valid
        private List<CreateItemDto> items;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateItemDto {
        @NotNull(message = "Variant ID is required")
        private UUID variantId;
        @NotNull(message = "Ordered quantity is required")
        @Min(value = 1, message = "Ordered quantity must be at least 1")
        private Integer orderedQty;
        @NotNull(message = "Unit cost is required")
        @DecimalMin(value = "0.00", message = "Unit cost cannot be negative")
        private BigDecimal unitCost;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReceiveRequest {
        @NotEmpty(message = "Receive items list cannot be empty")
        @Valid
        private List<ReceiveItemDto> items;
        private String notes;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReceiveItemDto {
        @NotNull(message = "PO Item ID is required")
        private UUID poItemId;
        @NotNull(message = "Received quantity is required")
        @Min(value = 1, message = "Received quantity must be at least 1")
        private Integer receivedQty;
        @DecimalMin(value = "0.00", message = "Unit cost cannot be negative")
        private BigDecimal unitCostOverride;
    }
}
