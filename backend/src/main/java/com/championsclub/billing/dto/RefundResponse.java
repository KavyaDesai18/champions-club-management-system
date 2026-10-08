package com.championsclub.billing.dto;

import com.championsclub.billing.domain.RefundStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefundResponse {

    private UUID id;
    private UUID paymentId;
    private BigDecimal amount;
    private String reason;
    private String refundRef;
    private RefundStatus status;
    private String creditNoteNumber;
    private UUID creditNoteId;
    private Instant createdAt;
}
