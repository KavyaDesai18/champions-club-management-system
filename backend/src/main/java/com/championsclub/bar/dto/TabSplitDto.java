package com.championsclub.bar.dto;

import com.championsclub.bar.domain.SplitType;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TabSplitDto {
    private UUID id;
    private UUID tabId;
    private Integer splitNumber;
    private SplitType splitType;
    private BigDecimal amount;
    private BigDecimal tipAmount;
    private BigDecimal taxAmount;
    private BigDecimal discountAmount;
    private UUID paymentId;
    private String status;
    private String itemIds;
}
