package com.championsclub.shop.dto;

import com.championsclub.shop.domain.StockMovementType;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockMovementResponse {
    private UUID id;
    private UUID variantId;
    private String variantSku;
    private String productName;
    private StockMovementType type;
    private Integer qty;
    private String reference;
    private String reason;
    private String createdBy;
    private Instant createdAt;
}
