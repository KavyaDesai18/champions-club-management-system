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
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicTrialBookingRequest {

    @NotBlank(message = "Name is required")
    @Size(max = 150)
    private String name;

    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Phone number is required for booking confirmation")
    @Size(max = 50)
    private String phone;

    private UUID sportId;

    @NotNull(message = "Court ID is required")
    private UUID courtId;

    @NotNull(message = "Booking date is required")
    private LocalDate date;

    @NotNull(message = "Start time is required")
    private LocalTime startTime;

    @Size(max = 500)
    private String notes;

    @Builder.Default
    private Boolean consent = true;

    // Honeypot field
    private String website_hp;
}
