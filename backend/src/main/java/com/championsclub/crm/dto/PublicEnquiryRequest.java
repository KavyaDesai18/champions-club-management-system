package com.championsclub.crm.dto;

import com.championsclub.crm.domain.LeadSource;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicEnquiryRequest {

    @NotBlank(message = "Name is required")
    @Size(max = 150, message = "Name must not exceed 150 characters")
    private String name;

    @Email(message = "Invalid email format")
    @Size(max = 150, message = "Email must not exceed 150 characters")
    private String email;

    @Size(max = 50, message = "Phone must not exceed 50 characters")
    private String phone;

    @Builder.Default
    private LeadSource source = LeadSource.WEB_FORM;

    @Size(max = 100, message = "Interest must not exceed 100 characters")
    private String interest;

    @Size(max = 2000, message = "Message must not exceed 2000 characters")
    private String message;

    @Builder.Default
    private Boolean consent = true;

    // Honeypot field for bot/spam protection (should be empty from real humans)
    private String website_hp;
}
