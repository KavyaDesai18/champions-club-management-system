package com.championsclub.member.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChangePlanRequest {
    @NotBlank(message = "New plan code is required")
    private String planCode;
    private String reason;
}
