package com.championsclub.hr.dto;

import com.championsclub.hr.domain.PayrollRunStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdatePayrollStatusRequest {

    @NotNull(message = "Status is required")
    private PayrollRunStatus status; // REVIEW, APPROVED, PAID

    private String notes;
}
