package com.championsclub.hr.dto;

import com.championsclub.hr.domain.RosterShift;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RosterShiftDto {
    private UUID id;
    private UUID employeeId;
    private String employeeName;
    private String empNo;
    private LocalDate shiftDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private String department;
    private String station;
    private String role;
    private boolean isPublished;
    private Instant publishedAt;
    private String notes;

    public static RosterShiftDto fromEntity(RosterShift shift) {
        if (shift == null) return null;
        return RosterShiftDto.builder()
                .id(shift.getId())
                .employeeId(shift.getEmployee() != null ? shift.getEmployee().getId() : null)
                .employeeName(shift.getEmployee() != null && shift.getEmployee().getUser() != null ?
                        shift.getEmployee().getUser().getFullName() : null)
                .empNo(shift.getEmployee() != null ? shift.getEmployee().getEmpNo() : null)
                .shiftDate(shift.getShiftDate())
                .startTime(shift.getStartTime())
                .endTime(shift.getEndTime())
                .department(shift.getDepartment())
                .station(shift.getStation())
                .role(shift.getRole())
                .isPublished(shift.isPublished())
                .publishedAt(shift.getPublishedAt())
                .notes(shift.getNotes())
                .build();
    }
}
