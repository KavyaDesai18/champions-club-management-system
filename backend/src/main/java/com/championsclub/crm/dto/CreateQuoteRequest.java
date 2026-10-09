package com.championsclub.crm.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateQuoteRequest {

    @NotNull(message = "Lead ID is required")
    private UUID leadId;

    @NotEmpty(message = "Quote must have at least one line item")
    @Valid
    private List<QuoteLineDto> lines;

    @Builder.Default
    private BigDecimal taxRate = BigDecimal.valueOf(0.18); // 18% GST default

    @Builder.Default
    private Integer validityDays = 14;

    private String notes;
}
