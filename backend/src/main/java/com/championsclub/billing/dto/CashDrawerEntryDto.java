package com.championsclub.billing.dto;

import com.championsclub.billing.domain.CashDrawerEntryType;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CashDrawerEntryDto {

    private UUID id;
    private CashDrawerEntryType entryType;
    private BigDecimal amount;
    private BigDecimal runningBalance;
    private UUID paymentId;
    private UUID refundId;
    private String notes;
    private Instant createdAt;
}
