package com.championsclub.crm.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConvertLeadRequest {

    @NotBlank(message = "Membership plan code is required")
    @Builder.Default
    private String planCode = "SILVER";

    private LocalDate dob;

    private String gender;

    private String address;

    private String emergencyContact;

    @Builder.Default
    private Boolean createPortalAccount = true;

    private String portalPassword;
}
