package com.championsclub.shop.dto;

import com.championsclub.shop.domain.JobTicketStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceJobTicketDto {

    private UUID id;
    private String ticketNumber;
    private UUID serviceId;
    private String serviceName;
    private UUID memberId;
    private String memberName;
    private String memberPhone;
    private String guestName;
    private String guestPhone;
    private JobTicketStatus status;
    private String stringType;
    private BigDecimal tensionLbs;
    private String turnaroundType;
    private UUID loanVariantId;
    private String loanVariantSku;
    private Boolean loanReturned;
    private BigDecimal totalPrice;
    private String notes;
    private String createdBy;
    private Instant completedAt;
    private Instant createdAt;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateRequest {
        @NotNull(message = "Service ID is required")
        private UUID serviceId;
        private UUID memberId;
        private String guestName;
        private String guestPhone;
        private String stringType;
        @DecimalMin(value = "10.0", message = "Tension must be at least 10 lbs")
        private BigDecimal tensionLbs;
        @Builder.Default
        private String turnaroundType = "STANDARD_3_DAYS";
        private UUID loanVariantId;
        private String notes;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UpdateStatusRequest {
        @NotNull(message = "New status is required")
        private JobTicketStatus status;
        private Boolean loanReturned;
        private String notes;
    }
}
