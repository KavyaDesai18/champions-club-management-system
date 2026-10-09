package com.championsclub.reporting.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LowStockItemDto {
    private String sku;
    private String productName;
    private String variantName;
    private int currentStock;
    private int reorderPoint;
    private String status; // CRITICAL, LOW, REORDER
}
