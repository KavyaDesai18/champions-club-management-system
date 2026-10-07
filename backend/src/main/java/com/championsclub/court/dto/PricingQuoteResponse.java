package com.championsclub.court.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PricingQuoteResponse {

    private UUID courtId;
    private String courtName;
    private String sportName;
    private Instant startTime;
    private Instant endTime;
    private UUID memberId;
    private String planCode;
    private BigDecimal price;
    private String currency;
    private UUID matchedRuleId;
    private List<String> explanation;
}
