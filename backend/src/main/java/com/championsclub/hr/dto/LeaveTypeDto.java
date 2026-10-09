package com.championsclub.hr.dto;

import com.championsclub.hr.domain.LeaveType;
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
public class LeaveTypeDto {
    private UUID id;
    private String code;
    private String name;
    private BigDecimal annualQuota;
    private boolean isPaid;
    private BigDecimal carryForwardMax;

    public static LeaveTypeDto fromEntity(LeaveType lt) {
        if (lt == null) return null;
        return LeaveTypeDto.builder()
                .id(lt.getId())
                .code(lt.getCode())
                .name(lt.getName())
                .annualQuota(lt.getAnnualQuota())
                .isPaid(lt.isPaid())
                .carryForwardMax(lt.getCarryForwardMax())
                .build();
    }
}
