package com.championsclub.crm.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OnlineMembershipPurchaseRequest {

    @NotBlank(message = "Full name is required")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Phone number is required")
    private String phone;

    @NotNull(message = "Date of birth is required")
    private LocalDate dob;

    @NotBlank(message = "Membership plan code is required")
    private String planCode;

    private String address;

    private String emergencyContact;

    @Builder.Default
    private String paymentMethod = "UPI"; // UPI, CARD, NET_BANKING

    private String paymentReference;

    // Honeypot field
    private String website_hp;
}
