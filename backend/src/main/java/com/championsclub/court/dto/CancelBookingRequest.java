package com.championsclub.court.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CancelBookingRequest {
    private String reason;
    private boolean staffOverride;
    private String overrideReason;
}
