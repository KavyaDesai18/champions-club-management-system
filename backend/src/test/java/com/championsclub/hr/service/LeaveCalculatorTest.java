package com.championsclub.hr.service;

import com.championsclub.hr.domain.Holiday;
import com.championsclub.hr.dto.LeaveCalculationDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class LeaveCalculatorTest {

    private LeaveCalculator calculator;
    private List<Holiday> holidays;

    @BeforeEach
    void setUp() {
        calculator = new LeaveCalculator();
        // Standard official holidays for 2026
        holidays = List.of(
                Holiday.builder().name("New Year").holidayDate(LocalDate.of(2026, 1, 1)).build(),
                Holiday.builder().name("Republic Day").holidayDate(LocalDate.of(2026, 1, 26)).build(),
                Holiday.builder().name("Independence Day").holidayDate(LocalDate.of(2026, 8, 15)).build()
        );
    }

    @ParameterizedTest(name = "{0} to {1} (halfDay={2}) -> expected {3} days (weekends={4}, holidays={5})")
    @CsvSource({
            // Single weekday (Wednesday)
            "2026-06-10, 2026-06-10, false, 1.0, 0, 0",
            // Spanning weekend: Friday to Monday (4 total calendar days, Sat/Sun excluded -> 2 working days)
            "2026-06-12, 2026-06-15, false, 2.0, 2, 0",
            // Republic Day 2026-01-26 is Monday: Mon 26 to Tue 27 -> 1 working day (Mon is holiday)
            "2026-01-26, 2026-01-27, false, 1.0, 0, 1",
            // Spanning month boundary: Jan 30 (Fri) to Feb 02 (Mon) -> 2 working days (Sat 31, Sun 1 excluded)
            "2026-01-30, 2026-02-02, false, 2.0, 2, 0",
            // Full week Mon-Sun: 5 working days, 2 weekend days
            "2026-06-08, 2026-06-14, false, 5.0, 2, 0",
            // Single weekday half-day
            "2026-06-10, 2026-06-10, true, 0.5, 0, 0"
    })
    @DisplayName("Table-driven leave day counting excluding weekends and public holidays")
    void testLeaveCalculationTableDriven(
            String startStr,
            String endStr,
            boolean isHalfDay,
            String expectedDays,
            long expectedWeekends,
            long expectedHolidays
    ) {
        LocalDate start = LocalDate.parse(startStr);
        LocalDate end = LocalDate.parse(endStr);

        LeaveCalculationDto result = calculator.calculateWorkingDays(start, end, isHalfDay, holidays);

        assertThat(result.isValid()).isTrue();
        assertThat(result.getWorkingDaysCount()).isEqualByComparingTo(new BigDecimal(expectedDays));
        assertThat(result.getWeekendsCount()).isEqualTo(expectedWeekends);
        assertThat(result.getHolidaysCount()).isEqualTo(expectedHolidays);
    }

    @Test
    @DisplayName("Half-day leave on a weekend or public holiday must be flagged as invalid")
    void testHalfDayOnHolidayOrWeekendRejected() {
        // 2026-01-26 is Republic Day
        LocalDate holidayDate = LocalDate.of(2026, 1, 26);
        LeaveCalculationDto res1 = calculator.calculateWorkingDays(holidayDate, holidayDate, true, holidays);
        assertThat(res1.isValid()).isFalse();
        assertThat(res1.getValidationMessage()).contains("weekend or holiday");

        // 2026-06-13 is Saturday
        LocalDate weekendDate = LocalDate.of(2026, 6, 13);
        LeaveCalculationDto res2 = calculator.calculateWorkingDays(weekendDate, weekendDate, true, holidays);
        assertThat(res2.isValid()).isFalse();
        assertThat(res2.getValidationMessage()).contains("weekend or holiday");
    }

    @Test
    @DisplayName("Half-day leave spanning multiple dates must be flagged as invalid")
    void testHalfDayMultiDayRejected() {
        LocalDate start = LocalDate.parse("2026-06-10");
        LocalDate end = LocalDate.parse("2026-06-11");
        LeaveCalculationDto res = calculator.calculateWorkingDays(start, end, true, holidays);
        assertThat(res.isValid()).isFalse();
        assertThat(res.getValidationMessage()).contains("same calendar day");
    }

    @Test
    @DisplayName("Start date after end date must be flagged as invalid")
    void testStartDateAfterEndDateRejected() {
        LocalDate start = LocalDate.parse("2026-06-15");
        LocalDate end = LocalDate.parse("2026-06-10");
        LeaveCalculationDto res = calculator.calculateWorkingDays(start, end, false, holidays);
        assertThat(res.isValid()).isFalse();
        assertThat(res.getValidationMessage()).contains("Start date cannot be after end date");
    }
}
