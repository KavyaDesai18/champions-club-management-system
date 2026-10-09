package com.championsclub.hr.dto;

import com.championsclub.hr.domain.Employee;
import com.championsclub.hr.domain.EmployeeStatus;
import com.championsclub.hr.domain.SalaryType;
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
public class EmployeeDto {
    private UUID id;
    private UUID userId;
    private String fullName;
    private String email;
    private String phone;
    private String empNo;
    private String designation;
    private String department;
    private LocalDate joinDate;
    private SalaryType salaryType;
    private BigDecimal baseSalary;
    private BigDecimal hourlyRate;
    private String bankName;
    private String bankAccountMasked;
    private String bankIfsc;
    private String panNumberMasked;
    private EmployeeStatus status;
    private LocalDate exitDate;
    private String emergencyContactPhone;
    private String notes;
    private Instant createdAt;

    public static EmployeeDto fromEntity(Employee emp) {
        if (emp == null) return null;
        return EmployeeDto.builder()
                .id(emp.getId())
                .userId(emp.getUser() != null ? emp.getUser().getId() : null)
                .fullName(emp.getUser() != null ? emp.getUser().getFullName() : null)
                .email(emp.getUser() != null ? emp.getUser().getEmail() : null)
                .phone(emp.getUser() != null ? emp.getUser().getPhone() : null)
                .empNo(emp.getEmpNo())
                .designation(emp.getDesignation())
                .department(emp.getDepartment())
                .joinDate(emp.getJoinDate())
                .salaryType(emp.getSalaryType())
                .baseSalary(emp.getBaseSalary())
                .hourlyRate(emp.getHourlyRate())
                .bankName(emp.getBankName())
                .bankAccountMasked(emp.getBankAccountMasked())
                .bankIfsc(emp.getBankIfsc())
                .panNumberMasked(emp.getPanNumberMasked())
                .status(emp.getStatus())
                .exitDate(emp.getExitDate())
                .emergencyContactPhone(emp.getEmergencyContactPhone())
                .notes(emp.getNotes())
                .createdAt(emp.getCreatedAt())
                .build();
    }
}
