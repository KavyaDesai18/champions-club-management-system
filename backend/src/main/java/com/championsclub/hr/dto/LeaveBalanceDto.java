package com.championsclub.hr.dto;

import com.championsclub.hr.domain.LeaveBalance;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaveBalanceDto {
    private UUID id;
    private UUID employeeId;
    private String employeeName;
    private String empNo;
    private String leaveTypeCode;
    private int year;
    private BigDecimal allocatedDays;
    private BigDecimal usedDays;
    private BigDecimal pendingDays;
    private BigDecimal remainingDays;

    public static LeaveBalanceDto fromEntity(LeaveBalance lb) {
        if (lb == null) return null;
        return LeaveBalanceDto.builder()
                .id(lb.getId())
                .employeeId(lb.getEmployee() != null ? lb.getEmployee().getId() : null)
                .employeeName(lb.getEmployee() != null && lb.getEmployee().getUser() != null ?
                        lb.getEmployee().getUser().getFullName() : null)
                .empNo(lb.getEmployee() != null ? lb.getEmployee().getEmpNo() : null)
                .leaveTypeCode(lb.getLeaveTypeCode())
                .year(lb.getYear())
                .allocatedDays(lb.getAllocatedDays())
                .usedDays(lb.getUsedDays())
                .pendingDays(lb.getPendingDays())
                .remainingDays(lb.getRemainingDays())
                .build();
    }
}
