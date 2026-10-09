package com.championsclub.crm.dto;

import com.championsclub.crm.domain.LeadActivityType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddLeadActivityRequest {

    @NotNull(message = "Activity type is required")
    private LeadActivityType type;

    @NotBlank(message = "Details are required")
    private String details;
}
