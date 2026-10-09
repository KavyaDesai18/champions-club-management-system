package com.championsclub.hr.dto;

import com.championsclub.hr.domain.SalaryType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateEmployeeRequest {

    @NotNull(message = "User ID is required")
    private UUID userId;

    @NotBlank(message = "Designation is required")
    private String designation;

    @NotBlank(message = "Department is required")
    private String department;

    @NotNull(message = "Join date is required")
    private LocalDate joinDate;

    @Builder.Default
    private SalaryType salaryType = SalaryType.MONTHLY;

    @NotNull(message = "Base salary is required")
    private BigDecimal baseSalary;

    @Builder.Default
    private BigDecimal hourlyRate = BigDecimal.ZERO;

    private String bankName;
    private String bankAccount;
    private String bankIfsc;
    private String panNumber;
    private String emergencyContactPhone;
    private String notes;
}
