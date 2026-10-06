package com.championsclub.member.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterMemberRequest {

    @NotBlank(message = "Full name is required")
    private String fullName;

    @NotBlank(message = "Email address is required")
    @Email(message = "Email format is invalid")
    private String email;

    @NotBlank(message = "Phone number is required")
    private String phone;

    @NotNull(message = "Date of birth is required")
    private LocalDate dob;

    private String gender;

    private String address;

    private String emergencyContact;

    @NotBlank(message = "Plan code is required (e.g. GOLD, SILVER, JUNIOR)")
    private String planCode;

    private String notes;

    private LocalDate startDate;

    // Guardian details (Mandatory if age < 18)
    private String guardianName;
    private String guardianPhone;
    private String guardianRelation;
    private Boolean guardianConsent;

    // Optional Member Portal user creation
    @Builder.Default
    private Boolean createPortalAccount = false;
    private String portalPassword;
}
