package com.championsclub.shop.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductCreateRequest {

    @NotBlank(message = "Product SKU is required")
    private String sku;

    @NotBlank(message = "Product name is required")
    private String name;

    private String description;

    @NotNull(message = "Category ID is required")
    private UUID categoryId;

    @NotBlank(message = "Brand is required")
    private String brand;

    @NotNull(message = "Base price is required")
    @DecimalMin(value = "0.00", message = "Base price cannot be negative")
    private BigDecimal basePrice;

    @Builder.Default
    private String taxCategory = "STANDARD";

    private List<String> images;

    @Builder.Default
    private Boolean active = true;

    private List<VariantCreateDto> variants;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class VariantCreateDto {
        @NotBlank(message = "Variant SKU is required")
        private String sku;
        private String size;
        private String color;
        private BigDecimal priceOverride;
        private String barcode;
        private BigDecimal costPrice;
        private Integer reorderLevel;
        private Integer reorderQty;
        private Integer initialStock;
    }
}
