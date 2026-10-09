package com.championsclub.hr.service;

import com.championsclub.hr.domain.Holiday;
import com.championsclub.hr.dto.LeaveCalculationDto;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class LeaveCalculator {

    /**
     * Calculates working leave days between startDate and endDate (inclusive),
     * excluding weekends (Saturday and Sunday) and official holidays.
     * Handles half-day requests and leave spanning month boundaries.
     */
    public LeaveCalculationDto calculateWorkingDays(
            LocalDate startDate,
            LocalDate endDate,
            boolean isHalfDay,
            List<Holiday> holidays
    ) {
        if (startDate == null || endDate == null) {
            return LeaveCalculationDto.builder()
                    .isValid(false)
                    .validationMessage("Start date and end date must not be null")
                    .workingDaysCount(BigDecimal.ZERO)
                    .build();
        }

        if (startDate.isAfter(endDate)) {
            return LeaveCalculationDto.builder()
                    .startDate(startDate)
                    .endDate(endDate)
                    .isValid(false)
                    .validationMessage("Start date cannot be after end date")
                    .workingDaysCount(BigDecimal.ZERO)
                    .build();
        }

        Map<LocalDate, Holiday> holidayMap = holidays != null ?
                holidays.stream().collect(Collectors.toMap(Holiday::getHolidayDate, h -> h, (h1, h2) -> h1)) :
                Map.of();

        long totalCalendarDays = ChronoUnit.DAYS.between(startDate, endDate) + 1;
        long weekendsCount = 0;
        long holidaysCount = 0;
        long workingDaysRaw = 0;
        List<String> matchedHolidayNames = new ArrayList<>();

        LocalDate current = startDate;
        while (!current.isAfter(endDate)) {
            DayOfWeek dow = current.getDayOfWeek();
            boolean isWeekend = (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY);
            boolean isHoliday = holidayMap.containsKey(current);

            if (isWeekend) {
                weekendsCount++;
            } else if (isHoliday) {
                holidaysCount++;
                matchedHolidayNames.add(holidayMap.get(current).getName() + " (" + current + ")");
            } else {
                workingDaysRaw++;
            }
            current = current.plusDays(1);
        }

        if (isHalfDay) {
            // Half day must be on a single day
            if (!startDate.equals(endDate)) {
                return LeaveCalculationDto.builder()
                        .startDate(startDate)
                        .endDate(endDate)
                        .isHalfDay(true)
                        .totalCalendarDays(totalCalendarDays)
                        .weekendsCount(weekendsCount)
                        .holidaysCount(holidaysCount)
                        .workingDaysCount(BigDecimal.ZERO)
                        .isValid(false)
                        .validationMessage("Half-day leave must start and end on the same calendar day")
                        .build();
            }

            if (workingDaysRaw == 0) {
                return LeaveCalculationDto.builder()
                        .startDate(startDate)
                        .endDate(endDate)
                        .isHalfDay(true)
                        .totalCalendarDays(totalCalendarDays)
                        .weekendsCount(weekendsCount)
                        .holidaysCount(holidaysCount)
                        .workingDaysCount(BigDecimal.ZERO)
                        .holidayNames(matchedHolidayNames)
                        .isValid(false)
                        .validationMessage("Cannot apply half-day leave on a weekend or holiday")
                        .build();
            }

            return LeaveCalculationDto.builder()
                    .startDate(startDate)
                    .endDate(endDate)
                    .isHalfDay(true)
                    .totalCalendarDays(1)
                    .weekendsCount(weekendsCount)
                    .holidaysCount(holidaysCount)
                    .workingDaysCount(new BigDecimal("0.5"))
                    .holidayNames(matchedHolidayNames)
                    .isValid(true)
                    .build();
        }

        BigDecimal workingDaysCount = BigDecimal.valueOf(workingDaysRaw).setScale(1);

        boolean isValid = workingDaysRaw > 0;
        String validationMessage = isValid ? null : "Requested period contains only weekends or official holidays";

        return LeaveCalculationDto.builder()
                .startDate(startDate)
                .endDate(endDate)
                .isHalfDay(false)
                .totalCalendarDays(totalCalendarDays)
                .weekendsCount(weekendsCount)
                .holidaysCount(holidaysCount)
                .workingDaysCount(workingDaysCount)
                .holidayNames(matchedHolidayNames)
                .isValid(isValid)
                .validationMessage(validationMessage)
                .build();
    }
}
