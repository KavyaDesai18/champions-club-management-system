package com.championsclub.hr.dto;

import com.championsclub.hr.domain.PayrollRun;
import com.championsclub.hr.domain.PayrollRunStatus;
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
public class PayrollRunDto {
    private UUID id;
    private String runNumber;
    private int year;
    private int month;
    private PayrollRunStatus status;
    private BigDecimal totalGross;
    private BigDecimal totalDeductions;
    private BigDecimal totalNet;
    private String processedByName;
    private String approvedByName;
    private Instant approvedAt;
    private Instant paidAt;
    private String notes;
    private int payslipsCount;
    private Instant createdAt;

    public static PayrollRunDto fromEntity(PayrollRun pr) {
        if (pr == null) return null;
        return PayrollRunDto.builder()
                .id(pr.getId())
                .runNumber(pr.getRunNumber())
                .year(pr.getYear())
                .month(pr.getMonth())
                .status(pr.getStatus())
                .totalGross(pr.getTotalGross())
                .totalDeductions(pr.getTotalDeductions())
                .totalNet(pr.getTotalNet())
                .processedByName(pr.getProcessedBy() != null ? pr.getProcessedBy().getFullName() : null)
                .approvedByName(pr.getApprovedBy() != null ? pr.getApprovedBy().getFullName() : null)
                .approvedAt(pr.getApprovedAt())
                .paidAt(pr.getPaidAt())
                .notes(pr.getNotes())
                .payslipsCount(pr.getPayslips() != null ? pr.getPayslips().size() : 0)
                .createdAt(pr.getCreatedAt())
                .build();
    }
}
