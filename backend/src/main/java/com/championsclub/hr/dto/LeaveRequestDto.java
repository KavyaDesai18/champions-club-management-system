package com.championsclub.hr.dto;

import com.championsclub.hr.domain.HalfDaySession;
import com.championsclub.hr.domain.LeaveRequest;
import com.championsclub.hr.domain.LeaveRequestStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaveRequestDto {
    private UUID id;
    private UUID employeeId;
    private String employeeName;
    private String empNo;
    private String leaveTypeCode;
    private LocalDate startDate;
    private LocalDate endDate;
    private boolean isHalfDay;
    private HalfDaySession halfDaySession;
    private BigDecimal totalDays;
    private String reason;
    private LeaveRequestStatus status;
    private String reviewerName;
    private String reviewComment;
    private Instant reviewedAt;
    private Instant createdAt;

    public static LeaveRequestDto fromEntity(LeaveRequest lr) {
        if (lr == null) return null;
        return LeaveRequestDto.builder()
                .id(lr.getId())
                .employeeId(lr.getEmployee() != null ? lr.getEmployee().getId() : null)
                .employeeName(lr.getEmployee() != null && lr.getEmployee().getUser() != null ?
                        lr.getEmployee().getUser().getFullName() : null)
                .empNo(lr.getEmployee() != null ? lr.getEmployee().getEmpNo() : null)
                .leaveTypeCode(lr.getLeaveTypeCode())
                .startDate(lr.getStartDate())
                .endDate(lr.getEndDate())
                .isHalfDay(lr.isHalfDay())
                .halfDaySession(lr.getHalfDaySession())
                .totalDays(lr.getTotalDays())
                .reason(lr.getReason())
                .status(lr.getStatus())
                .reviewerName(lr.getReviewer() != null ? lr.getReviewer().getFullName() : null)
                .reviewComment(lr.getReviewComment())
                .reviewedAt(lr.getReviewedAt())
                .createdAt(lr.getCreatedAt())
                .build();
    }
}
