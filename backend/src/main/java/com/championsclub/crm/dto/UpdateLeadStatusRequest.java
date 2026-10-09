package com.championsclub.crm.dto;

import com.championsclub.crm.domain.LeadStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateLeadStatusRequest {

    @NotNull(message = "New status is required")
    private LeadStatus status;

    private String lostReason;

    private String note;
}
