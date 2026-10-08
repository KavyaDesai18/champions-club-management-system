package com.championsclub.shop.dto;

import jakarta.validation.constraints.DecimalMin;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductUpdateRequest {

    private String name;
    private String description;
    private UUID categoryId;
    private String brand;

    @DecimalMin(value = "0.00", message = "Base price cannot be negative")
    private BigDecimal basePrice;

    private String taxCategory;
    private List<String> images;
    private Boolean active;
    private List<ProductCreateRequest.VariantCreateDto> variants;
}
