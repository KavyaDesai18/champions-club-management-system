package com.championsclub.billing.dto;

import com.championsclub.billing.domain.PaymentSourceType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SplitPaymentRequest {

    private UUID payerUserId;
    private UUID memberId;
    private UUID corporateAccountId;

    private String payerName;
    private String payerEmail;
    private String payerPhone;

    @NotNull(message = "Source type is required")
    private PaymentSourceType sourceType;

    @NotNull(message = "Source ID is required")
    private String sourceId;

    @NotNull(message = "Total amount is required")
    @DecimalMin(value = "0.01", message = "Total amount must be positive")
    private BigDecimal totalAmount;

    @NotEmpty(message = "At least one split is required")
    @Valid
    private List<SplitItemDto> splits;

    private String notes;
    private boolean managerOverride;
    private UUID cashDrawerSessionId;
}
