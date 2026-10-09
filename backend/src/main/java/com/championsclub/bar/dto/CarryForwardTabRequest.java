package com.championsclub.bar.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CarryForwardTabRequest {
    @NotBlank(message = "Carry-forward reason is mandatory")
    private String reason;
}
