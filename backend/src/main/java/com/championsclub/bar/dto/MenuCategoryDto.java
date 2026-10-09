package com.championsclub.bar.dto;

import lombok.*;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MenuCategoryDto {
    private UUID id;
    private String name;
    private String code;
    private Integer displayOrder;
    private Boolean isActive;
    private List<MenuItemDto> items;
}
