package com.championsclub.crm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicCatalogItemDto {

    private UUID id;
    private String name;
    private String brand;
    private String category;
    private String description;
    private BigDecimal retailPrice;
    private String currency;
    private String stockStatus; // IN_STOCK, LOW_STOCK, OUT_OF_STOCK
    private String imageUrl;
}
