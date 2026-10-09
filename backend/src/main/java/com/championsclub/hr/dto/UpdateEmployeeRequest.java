package com.championsclub.hr.dto;

import com.championsclub.hr.domain.EmployeeStatus;
import com.championsclub.hr.domain.SalaryType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateEmployeeRequest {
    private String designation;
    private String department;
    private SalaryType salaryType;
    private BigDecimal baseSalary;
    private BigDecimal hourlyRate;
    private String bankName;
    private String bankAccount;
    private String bankIfsc;
    private String panNumber;
    private EmployeeStatus status;
    private LocalDate exitDate;
    private String emergencyContactPhone;
    private String notes;
}
