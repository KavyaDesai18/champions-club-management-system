package com.championsclub.hr.dto;

import com.championsclub.hr.domain.AttendanceRecord;
import com.championsclub.hr.domain.AttendanceSource;
import com.championsclub.hr.domain.AttendanceStatus;
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
public class AttendanceRecordDto {
    private UUID id;
    private UUID employeeId;
    private String employeeName;
    private String empNo;
    private LocalDate workDate;
    private Instant clockIn;
    private Instant clockOut;
    private AttendanceSource source;
    private AttendanceStatus status;
    private BigDecimal totalHours;
    private BigDecimal overtimeHours;
    private String regularizationNote;
    private String regularizedByName;
    private Instant regularizedAt;

    public static AttendanceRecordDto fromEntity(AttendanceRecord att) {
        if (att == null) return null;
        return AttendanceRecordDto.builder()
                .id(att.getId())
                .employeeId(att.getEmployee() != null ? att.getEmployee().getId() : null)
                .employeeName(att.getEmployee() != null && att.getEmployee().getUser() != null ?
                        att.getEmployee().getUser().getFullName() : null)
                .empNo(att.getEmployee() != null ? att.getEmployee().getEmpNo() : null)
                .workDate(att.getWorkDate())
                .clockIn(att.getClockIn())
                .clockOut(att.getClockOut())
                .source(att.getSource())
                .status(att.getStatus())
                .totalHours(att.getTotalHours())
                .overtimeHours(att.getOvertimeHours())
                .regularizationNote(att.getRegularizationNote())
                .regularizedByName(att.getRegularizedBy() != null ? att.getRegularizedBy().getFullName() : null)
                .regularizedAt(att.getRegularizedAt())
                .build();
    }
}
