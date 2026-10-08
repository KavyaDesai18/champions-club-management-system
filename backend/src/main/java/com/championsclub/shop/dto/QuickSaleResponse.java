package com.championsclub.shop.dto;

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
public class QuickSaleResponse {

    private UUID orderId;
    private String orderNumber;
    private String customerName;
    private BigDecimal totalBasePrice;
    private BigDecimal totalDiscount;
    private BigDecimal totalTax;
    private BigDecimal finalAmount;
    private String status;
    private String paymentMethod;
    private Instant createdAt;
    private List<QuickSaleItemResponse> items;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class QuickSaleItemResponse {
        private UUID itemId;
        private UUID variantId;
        private UUID serviceId;
        private String itemName;
        private String sku;
        private Integer quantity;
        private BigDecimal unitBasePrice;
        private BigDecimal unitDiscount;
        private BigDecimal unitTax;
        private BigDecimal unitFinalPrice;
        private BigDecimal totalPrice;
    }
}
