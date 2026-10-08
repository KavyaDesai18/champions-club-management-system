package com.championsclub.billing.dto;

import com.championsclub.billing.domain.CashDrawerStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CashDrawerSessionResponse {

    private UUID id;
    private UUID staffUserId;
    private String staffName;
    private Instant openedAt;
    private Instant closedAt;
    private BigDecimal openingBalance;
    private BigDecimal closingBalance;
    private BigDecimal calculatedCash;
    private BigDecimal discrepancy;
    private CashDrawerStatus status;
    private String notes;
    private List<CashDrawerEntryDto> entries;
}
