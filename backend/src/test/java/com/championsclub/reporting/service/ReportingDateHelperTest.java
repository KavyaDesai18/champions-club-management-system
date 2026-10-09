package com.championsclub.reporting.service;

import com.championsclub.reporting.domain.DateRangePreset;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;

class ReportingDateHelperTest {

    private final ReportingDateHelper helper = new ReportingDateHelper();

    @Test
    @DisplayName("Calculate TODAY preset produces single-day boundary in Asia/Kolkata")
    void testTodayPreset() {
        ReportingDateHelper.DateRange range = helper.calculateRange(DateRangePreset.TODAY, null, null);

        assertThat(range.getStartDate()).isEqualTo(range.getEndDate());
        assertThat(range.getStartInstant()).isBefore(range.getEndInstant());
        assertThat(range.getPreviousStartDate()).isEqualTo(range.getPreviousEndDate());
        assertThat(range.getPreviousEndDate()).isEqualTo(range.getStartDate().minusDays(1));
    }

    @Test
    @DisplayName("Calculate THIS_WEEK preset spans Monday to Sunday")
    void testThisWeekPreset() {
        ReportingDateHelper.DateRange range = helper.calculateRange(DateRangePreset.THIS_WEEK, null, null);

        assertThat(range.getStartDate().getDayOfWeek()).isEqualTo(DayOfWeek.MONDAY);
        assertThat(range.getEndDate().getDayOfWeek()).isEqualTo(DayOfWeek.SUNDAY);
        long days = ChronoUnit.DAYS.between(range.getStartDate(), range.getEndDate()) + 1;
        assertThat(days).isEqualTo(7);

        long prevDays = ChronoUnit.DAYS.between(range.getPreviousStartDate(), range.getPreviousEndDate()) + 1;
        assertThat(prevDays).isEqualTo(7);
        assertThat(range.getPreviousEndDate()).isEqualTo(range.getStartDate().minusDays(1));
    }

    @Test
    @DisplayName("Calculate THIS_MONTH preset spans 1st of month to last day of month")
    void testThisMonthPreset() {
        ReportingDateHelper.DateRange range = helper.calculateRange(DateRangePreset.THIS_MONTH, null, null);

        assertThat(range.getStartDate().getDayOfMonth()).isEqualTo(1);
        assertThat(range.getEndDate().getDayOfMonth()).isEqualTo(range.getStartDate().lengthOfMonth());
        assertThat(range.getStartInstant()).isBefore(range.getEndInstant());
    }

    @Test
    @DisplayName("Calculate CUSTOM preset correctly handles reversed dates and computes matching previous period")
    void testCustomRangeReversed() {
        LocalDate start = LocalDate.of(2026, 6, 1);
        LocalDate end = LocalDate.of(2026, 6, 15);

        // Passed reversed
        ReportingDateHelper.DateRange range = helper.calculateRange(DateRangePreset.CUSTOM, end, start);

        assertThat(range.getStartDate()).isEqualTo(start);
        assertThat(range.getEndDate()).isEqualTo(end);
        long days = ChronoUnit.DAYS.between(range.getStartDate(), range.getEndDate()) + 1;
        assertThat(days).isEqualTo(15);

        long prevDays = ChronoUnit.DAYS.between(range.getPreviousStartDate(), range.getPreviousEndDate()) + 1;
        assertThat(prevDays).isEqualTo(15);
        assertThat(range.getPreviousEndDate()).isEqualTo(start.minusDays(1));
    }
}
