package com.championsclub.shop.dto;

import com.championsclub.shop.domain.StockStatus;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BarcodeLookupResponse {

    private UUID variantId;
    private UUID productId;
    private String barcode;
    private String sku;
    private String productName;
    private String brand;
    private String categoryName;
    private String size;
    private String color;
    private BigDecimal basePrice;
    private BigDecimal effectivePrice;
    private Integer onHand;
    private Integer reserved;
    private Integer available;
    private StockStatus stockStatus;

    // Optional calculated quote for POS
    private PriceQuoteResponse priceQuote;
}
