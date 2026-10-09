package com.championsclub.bar.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VoidTabItemRequest {
    @NotBlank(message = "Void reason is mandatory")
    private String reason;

    private String managerPin; // required if item status is SERVED
}
