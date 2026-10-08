package com.championsclub.shop.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PriceQuoteResponse {

    private UUID variantId;
    private UUID serviceId;
    private String itemName;
    private String sku;
    private Integer quantity;

    private BigDecimal unitBasePrice;
    private BigDecimal discountPercentage;
    private BigDecimal unitDiscount;
    private BigDecimal unitNetPrice; // unitBasePrice - unitDiscount
    private String taxCategory;
    private BigDecimal taxRatePercentage;
    private BigDecimal unitTax;
    private BigDecimal unitFinalPrice;

    private BigDecimal totalBasePrice;
    private BigDecimal totalDiscount;
    private BigDecimal totalTax;
    private BigDecimal totalFinalPrice;

    private String appliedTier;
}
