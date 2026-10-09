package com.championsclub.crm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicPriceDto {

    private String sportName;
    private String surfaceType;
    private BigDecimal memberHourlyRate;
    private BigDecimal guestHourlyRate;
    private BigDecimal peakSurgeRate;
    private BigDecimal trialSessionFee;
    private List<String> courtNames;
}
