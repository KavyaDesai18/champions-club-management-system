package com.championsclub.shop.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
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
public class QuickSaleRequest {

    private UUID memberId;
    private String customerName;
    @Builder.Default
    private String paymentMethod = "CASH"; // CASH, CARD, WALLET, COUNTER_QUICK_SALE
    @NotEmpty(message = "Order must contain at least one item")
    @Valid
    private List<QuickSaleItemRequest> items;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class QuickSaleItemRequest {
        private UUID variantId;
        private UUID serviceId;
        private String barcode; // Optional barcode scan
        @Builder.Default
        private Integer quantity = 1;
    }
}
