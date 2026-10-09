package com.championsclub.hr.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaveApprovalResultDto {
    private LeaveRequestDto leaveRequest;
    @Builder.Default
    private List<String> coverageWarnings = new ArrayList<>();
    private boolean rosterUpdated;
}
