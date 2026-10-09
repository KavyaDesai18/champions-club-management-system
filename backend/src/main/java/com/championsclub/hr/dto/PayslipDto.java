package com.championsclub.hr.dto;

import com.championsclub.hr.domain.Payslip;
import com.championsclub.hr.domain.PayslipStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PayslipDto {
    private UUID id;
    private UUID payrollRunId;
    private UUID employeeId;
    private String employeeName;
    private String empNo;
    private String designation;
    private String department;
    private String payslipNumber;
    private int year;
    private int month;
    private BigDecimal baseSalary;
    private BigDecimal prorationFactor;
    private int workingDaysInMonth;
    private BigDecimal daysWorked;
    private BigDecimal unpaidLeaveDays;
    private BigDecimal overtimeHours;
    private BigDecimal overtimePay;
    private BigDecimal allowances;
    private BigDecimal grossPay;
    private BigDecimal taxDeduction;
    private BigDecimal unpaidLeaveDeduction;
    private BigDecimal otherDeductions;
    private BigDecimal totalDeductions;
    private BigDecimal netPay;
    private PayslipStatus status;
    private String pdfUrl;
    private String bankName;
    private String bankAccountMasked;
    private String panNumberMasked;
    private Instant createdAt;

    public static PayslipDto fromEntity(Payslip ps) {
        if (ps == null) return null;
        return PayslipDto.builder()
                .id(ps.getId())
                .payrollRunId(ps.getPayrollRun() != null ? ps.getPayrollRun().getId() : null)
                .employeeId(ps.getEmployee() != null ? ps.getEmployee().getId() : null)
                .employeeName(ps.getEmployee() != null && ps.getEmployee().getUser() != null ?
                        ps.getEmployee().getUser().getFullName() : null)
                .empNo(ps.getEmployee() != null ? ps.getEmployee().getEmpNo() : null)
                .designation(ps.getEmployee() != null ? ps.getEmployee().getDesignation() : null)
                .department(ps.getEmployee() != null ? ps.getEmployee().getDepartment() : null)
                .payslipNumber(ps.getPayslipNumber())
                .year(ps.getYear())
                .month(ps.getMonth())
                .baseSalary(ps.getBaseSalary())
                .prorationFactor(ps.getProrationFactor())
                .workingDaysInMonth(ps.getWorkingDaysInMonth())
                .daysWorked(ps.getDaysWorked())
                .unpaidLeaveDays(ps.getUnpaidLeaveDays())
                .overtimeHours(ps.getOvertimeHours())
                .overtimePay(ps.getOvertimePay())
                .allowances(ps.getAllowances())
                .grossPay(ps.getGrossPay())
                .taxDeduction(ps.getTaxDeduction())
                .unpaidLeaveDeduction(ps.getUnpaidLeaveDeduction())
                .otherDeductions(ps.getOtherDeductions())
                .totalDeductions(ps.getTotalDeductions())
                .netPay(ps.getNetPay())
                .status(ps.getStatus())
                .pdfUrl(ps.getPdfUrl())
                .bankName(ps.getEmployee() != null ? ps.getEmployee().getBankName() : null)
                .bankAccountMasked(ps.getEmployee() != null ? ps.getEmployee().getBankAccountMasked() : null)
                .panNumberMasked(ps.getEmployee() != null ? ps.getEmployee().getPanNumberMasked() : null)
                .createdAt(ps.getCreatedAt())
                .build();
    }
}
