package com.championsclub.hr.dto;

import com.championsclub.hr.domain.LeaveRequestStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewLeaveRequest {

    @NotNull(message = "Review status is required")
    private LeaveRequestStatus status; // APPROVED, REJECTED

    private String comment;
}
