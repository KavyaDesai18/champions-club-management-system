package com.championsclub.bar.dto;

import com.championsclub.bar.domain.StationType;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MenuItemDto {
    private UUID id;
    private UUID categoryId;
    private String categoryName;
    private String name;
    private String description;
    private BigDecimal price;
    private String taxCategory;
    private StationType prepStation;
    private Boolean isAvailable;
    private String modifiers;
    private Boolean isAlcoholic;
    private String ingredientStockLink;
}
