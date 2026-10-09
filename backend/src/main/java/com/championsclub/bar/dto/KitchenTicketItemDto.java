package com.championsclub.bar.dto;

import com.championsclub.bar.domain.TabItemStatus;
import lombok.*;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KitchenTicketItemDto {
    private UUID id;
    private UUID tabItemId;
    private String itemName;
    private Integer qty;
    private String modifiers;
    private String notes;
    private TabItemStatus status;
}
