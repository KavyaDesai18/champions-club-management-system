package com.championsclub.shop.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartResponse {
    private UUID orderId;
    private String orderNo;
    @Builder.Default
    private List<CartItemDto> items = new ArrayList<>();
    private BigDecimal subtotal;
    private BigDecimal discount;
    private BigDecimal tax;
    private BigDecimal estimatedTotal;
    private boolean hasStockWarnings;
    private boolean hasPriceDiffs;
    private int totalItemCount;
}
