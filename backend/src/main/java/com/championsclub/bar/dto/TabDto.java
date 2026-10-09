package com.championsclub.bar.dto;

import com.championsclub.bar.domain.TabStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TabDto {
    private UUID id;
    private String tabNumber;
    private UUID tableId;
    private String tableLabel;
    private UUID memberId;
    private String memberName;
    private String memberNo;
    private String memberPlanCode;
    private BigDecimal memberPlanDiscountPct;
    private String guestName;
    private Boolean guestIsUnder18;
    private TabStatus status;
    private UUID openedByUserId;
    private String openedByName;
    private UUID shiftId;
    private BigDecimal subtotal;
    private BigDecimal discountAmount;
    private BigDecimal taxAmount;
    private BigDecimal tipAmount;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private Boolean isCarriedForward;
    private String carryForwardReason;
    private Long version;
    private List<TabItemDto> items;
    private Instant createdAt;
    private Instant settledAt;
}
