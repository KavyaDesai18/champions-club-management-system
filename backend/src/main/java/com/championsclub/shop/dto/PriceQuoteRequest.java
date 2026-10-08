package com.championsclub.shop.dto;

import jakarta.validation.constraints.Min;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PriceQuoteRequest {

    private UUID variantId;
    private UUID serviceId;

    @Builder.Default
    @Min(value = 1, message = "Quantity must be at least 1")
    private Integer quantity = 1;

    private UUID memberId;
}
