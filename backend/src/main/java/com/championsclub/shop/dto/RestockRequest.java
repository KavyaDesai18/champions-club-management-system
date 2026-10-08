package com.championsclub.shop.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RestockRequest {

    @NotNull(message = "Restock quantity is required")
    @Min(value = 1, message = "Restock quantity must be positive")
    private Integer qty;

    @DecimalMin(value = "0.00", message = "Unit cost cannot be negative")
    private BigDecimal unitCost;

    private String reference;

    private String reason;
}
