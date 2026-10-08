package com.championsclub.shop.dto;

import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartItemRequest {
    private UUID variantId;
    private UUID serviceId;
    private String itemType; // PRODUCT, SERVICE

    @Min(value = 1, message = "Quantity must be at least 1")
    private int qty;
}
