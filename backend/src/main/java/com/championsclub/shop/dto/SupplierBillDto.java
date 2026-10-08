package com.championsclub.shop.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SupplierBillDto {
    private UUID id;
    private String billNumber;
    private UUID poId;
    private String poNumber;
    private UUID supplierId;
    private String supplierName;
    private BigDecimal amount;
    private String status;
    private LocalDate dueDate;
    private String notes;
    private Instant createdAt;
}
