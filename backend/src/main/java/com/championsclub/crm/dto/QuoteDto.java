package com.championsclub.crm.dto;

import com.championsclub.crm.domain.QuoteStatus;
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
public class QuoteDto {

    private UUID id;
    private UUID leadId;
    private String leadName;
    private String quoteNumber;
    private List<QuoteLineDto> lines;
    private BigDecimal subtotal;
    private BigDecimal tax;
    private BigDecimal total;
    private Instant validUntil;
    private QuoteStatus status;
    private String pdfUrl;
    private String notes;
    private UUID createdById;
    private String createdByName;
    private Instant createdAt;
    private Instant updatedAt;
    private boolean expired;
}
