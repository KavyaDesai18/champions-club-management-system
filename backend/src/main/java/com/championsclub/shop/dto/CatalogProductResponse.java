package com.championsclub.shop.dto;

import com.championsclub.shop.domain.StockStatus;
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
public class CatalogProductResponse {

    private UUID id;
    private String sku;
    private String name;
    private String description;
    private CategoryDto category;
    private String brand;
    private BigDecimal basePrice;
    private String taxCategory;
    private List<String> images;
    private Boolean active;
    private StockStatus overallStockStatus;
    private List<VariantDto> variants;
    private Instant createdAt;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CategoryDto {
        private UUID id;
        private String code;
        private String name;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class VariantDto {
        private UUID id;
        private UUID productId;
        private String sku;
        private String size;
        private String color;
        private BigDecimal priceOverride;
        private BigDecimal effectivePrice;
        private String barcode;
        private StockStatus stockStatus;

        // Staff-only fields (omitted or null for public catalog)
        private Integer onHand;
        private Integer reserved;
        private Integer available;
        private BigDecimal costPrice;
        private Integer reorderLevel;
        private Integer reorderQty;
    }
}
