package com.championsclub.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Request payload for new member self-registration")
public class RegisterRequest {

    @NotBlank(message = "Full name is required.")
    @Size(min = 2, max = 150, message = "Full name must be between 2 and 150 characters.")
    @Schema(description = "Full legal name of the member", example = "Kavya Desai")
    private String fullName;

    @NotBlank(message = "Email address is required.")
    @Email(message = "Invalid email format.")
    @Schema(description = "Unique email address for login", example = "kavya@example.com")
    private String email;

    @NotBlank(message = "Password is required.")
    @Size(min = 8, max = 100, message = "Password must be at least 8 characters long.")
    @Schema(description = "Secure password following policy", example = "Champions@123")
    private String password;

    @Schema(description = "Contact phone number", example = "+919876543210")
    private String phone;
}
