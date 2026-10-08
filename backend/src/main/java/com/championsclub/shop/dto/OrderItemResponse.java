package com.championsclub.shop.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderItemResponse {
    private UUID id;
    private UUID variantId;
    private UUID serviceId;
    private String itemType;
    private String itemName;
    private String sku;
    private int qty;
    private BigDecimal unitPrice;
    private BigDecimal unitDiscount;
    private BigDecimal unitTax;
    private BigDecimal totalPrice;
}
