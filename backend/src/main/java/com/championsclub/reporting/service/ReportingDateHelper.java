package com.championsclub.reporting.service;

import com.championsclub.reporting.domain.DateRangePreset;
import lombok.Value;
import org.springframework.stereotype.Component;

import java.time.*;
import java.time.temporal.TemporalAdjusters;

@Component
public class ReportingDateHelper {

    public static final ZoneId CLUB_ZONE = ZoneId.of("Asia/Kolkata");

    @Value
    public static class DateRange {
        LocalDate startDate;
        LocalDate endDate;
        Instant startInstant;
        Instant endInstant;
        LocalDate previousStartDate;
        LocalDate previousEndDate;
        Instant previousStartInstant;
        Instant previousEndInstant;
    }

    public DateRange calculateRange(DateRangePreset preset, LocalDate customStart, LocalDate customEnd) {
        LocalDate today = LocalDate.now(CLUB_ZONE);
        LocalDate start;
        LocalDate end;

        if (preset == null) {
            preset = DateRangePreset.THIS_MONTH;
        }

        switch (preset) {
            case TODAY -> {
                start = today;
                end = today;
            }
            case THIS_WEEK -> {
                start = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                end = today.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
            }
            case THIS_MONTH -> {
                start = today.withDayOfMonth(1);
                end = today.with(TemporalAdjusters.lastDayOfMonth());
            }
            case LAST_MONTH -> {
                LocalDate lastMonth = today.minusMonths(1);
                start = lastMonth.withDayOfMonth(1);
                end = lastMonth.with(TemporalAdjusters.lastDayOfMonth());
            }
            case CUSTOM -> {
                start = (customStart != null) ? customStart : today.withDayOfMonth(1);
                end = (customEnd != null) ? customEnd : today;
                if (start.isAfter(end)) {
                    LocalDate tmp = start;
                    start = end;
                    end = tmp;
                }
            }
            default -> {
                start = today.withDayOfMonth(1);
                end = today.with(TemporalAdjusters.lastDayOfMonth());
            }
        }

        Instant startInstant = ZonedDateTime.of(start, LocalTime.MIN, CLUB_ZONE).toInstant();
        Instant endInstant = ZonedDateTime.of(end, LocalTime.MAX, CLUB_ZONE).toInstant();

        // Calculate comparison previous period of equal duration immediately preceding
        long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(start, end) + 1;
        LocalDate prevEnd = start.minusDays(1);
        LocalDate prevStart = prevEnd.minusDays(daysBetween - 1);

        Instant prevStartInstant = ZonedDateTime.of(prevStart, LocalTime.MIN, CLUB_ZONE).toInstant();
        Instant prevEndInstant = ZonedDateTime.of(prevEnd, LocalTime.MAX, CLUB_ZONE).toInstant();

        return new DateRange(
                start, end, startInstant, endInstant,
                prevStart, prevEnd, prevStartInstant, prevEndInstant
        );
    }
}
