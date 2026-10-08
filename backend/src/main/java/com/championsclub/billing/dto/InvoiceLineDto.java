package com.championsclub.billing.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvoiceLineDto {

    private UUID id;
    private String itemDescription;
    private Integer quantity;
    private BigDecimal unitPrice;
    private BigDecimal taxRatePercent;
    private BigDecimal taxAmount;
    private BigDecimal cgstAmount;
    private BigDecimal sgstAmount;
    private BigDecimal discountAmount;
    private BigDecimal lineTotal;
    private String employeeName;
    private String employeeId;
    private Instant serviceDate;
}
