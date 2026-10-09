package com.championsclub.hr.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaveCalculationDto {
    private LocalDate startDate;
    private LocalDate endDate;
    private boolean isHalfDay;
    private long totalCalendarDays;
    private long weekendsCount;
    private long holidaysCount;
    private BigDecimal workingDaysCount;
    @Builder.Default
    private List<String> holidayNames = new ArrayList<>();
    private boolean isValid;
    private String validationMessage;
}
