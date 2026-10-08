package com.championsclub.billing.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
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
public class BulkCorporateMembersRequest {

    @NotNull(message = "Corporate account ID is required")
    private UUID corporateAccountId;

    @NotNull(message = "Plan ID is required")
    private UUID planId;

    @NotNull(message = "Negotiated price is required")
    @DecimalMin(value = "0.00", message = "Negotiated price must be non-negative")
    private BigDecimal negotiatedPlanPrice;

    @NotEmpty(message = "At least one employee member is required")
    @Valid
    private List<CorporateEmployeeDto> employees;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CorporateEmployeeDto {
        @NotBlank(message = "Full name is required")
        private String fullName;

        @NotBlank(message = "Email is required")
        private String email;

        @NotBlank(message = "Phone is required")
        private String phone;

        private String corporateEmployeeId;
        private boolean canChargeToCompany;
    }
}
