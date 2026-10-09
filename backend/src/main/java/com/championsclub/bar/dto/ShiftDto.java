package com.championsclub.bar.dto;

import com.championsclub.bar.domain.ShiftStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShiftDto {
    private UUID id;
    private UUID staffUserId;
    private String staffName;
    private String role;
    private String station;
    private Instant startTime;
    private Instant endTime;
    private BigDecimal openingCash;
    private BigDecimal closingCash;
    private BigDecimal cashCollected;
    private BigDecimal cashVariance;
    private String notes;
    private ShiftStatus status;
    private UUID cashDrawerSessionId;
    private Long openTabsCount;
}
