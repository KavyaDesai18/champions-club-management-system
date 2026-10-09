package com.championsclub.bar.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CloseShiftRequest {
    @NotNull(message = "Closing cash counted is required")
    private BigDecimal closingCash;

    private String notes;

    @Builder.Default
    private Boolean carryForwardOpenTabs = false;

    private String carryForwardReason;
}
