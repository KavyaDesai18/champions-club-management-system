package com.championsclub.hr.dto;

import com.championsclub.hr.domain.HalfDaySession;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApplyLeaveRequest {

    private UUID employeeId;

    @NotBlank(message = "Leave type code is required")
    private String leaveTypeCode; // CASUAL, SICK, PAID, UNPAID

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    private LocalDate endDate;

    @Builder.Default
    private boolean isHalfDay = false;

    private HalfDaySession halfDaySession;

    @NotBlank(message = "Reason is required")
    private String reason;
}
