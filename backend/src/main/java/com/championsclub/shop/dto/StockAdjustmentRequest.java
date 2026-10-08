package com.championsclub.shop.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockAdjustmentRequest {

    @NotNull(message = "Physical counted stock is required")
    @Min(value = 0, message = "Physical stock cannot be negative")
    private Integer physicalCount;

    @NotBlank(message = "Adjustment reason is mandatory")
    private String reason;

    private String reference;
}
