package com.championsclub.shop.dto;

import com.championsclub.shop.domain.LowStockAlertStatus;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LowStockAlertResponse {
    private UUID id;
    private UUID variantId;
    private String variantSku;
    private String productName;
    private String brand;
    private String size;
    private String color;
    private Integer currentAvailable;
    private Integer reorderLevel;
    private Integer reorderQty;
    private LowStockAlertStatus status;
    private Instant createdAt;
    private Instant resolvedAt;
}
