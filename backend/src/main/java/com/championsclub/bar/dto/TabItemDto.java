package com.championsclub.bar.dto;

import com.championsclub.bar.domain.StationType;
import com.championsclub.bar.domain.TabItemStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TabItemDto {
    private UUID id;
    private UUID tabId;
    private UUID menuItemId;
    private String itemName;
    private StationType station;
    private BigDecimal unitPrice;
    private Integer qty;
    private BigDecimal discountRatePct;
    private BigDecimal discountAmount;
    private BigDecimal taxRatePct;
    private BigDecimal taxAmount;
    private BigDecimal lineTotal;
    private String notes;
    private String modifiers;
    private TabItemStatus status;
    private String voidedByName;
    private String voidReason;
    private Instant createdAt;
}
