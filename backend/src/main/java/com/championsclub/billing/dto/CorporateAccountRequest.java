package com.championsclub.billing.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CorporateAccountRequest {

    @NotBlank(message = "Company name is required")
    private String companyName;

    @NotBlank(message = "GSTIN is required")
    @Pattern(
        regexp = "^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$",
        message = "Invalid GSTIN format. Must be 15 characters matching Indian GSTIN standard (e.g. 29ABCDE1234F1Z5)"
    )
    private String gstin;

    @NotBlank(message = "Billing address is required")
    private String billingAddress;

    private String contactPerson;
    private String contactEmail;
    private String contactPhone;

    @NotNull(message = "Credit limit is required")
    @DecimalMin(value = "0.00", message = "Credit limit must be non-negative")
    private BigDecimal creditLimit;

    @Builder.Default
    private String paymentTerms = "NET_30";
}
