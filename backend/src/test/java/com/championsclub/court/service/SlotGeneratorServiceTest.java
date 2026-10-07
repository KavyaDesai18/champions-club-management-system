package com.championsclub.court.service;

import com.championsclub.common.time.ClubTimeUtils;
import com.championsclub.court.domain.Court;
import com.championsclub.court.domain.OpeningHours;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

class SlotGeneratorServiceTest {

    private SlotGeneratorService slotGeneratorService;
    private ClubTimeUtils timeUtils;
    private final ZoneId zoneId = ZoneId.of("Asia/Kolkata");
    private final Clock clock = Clock.fixed(Instant.parse("2026-10-08T10:00:00Z"), zoneId);

    @BeforeEach
    void setUp() {
        timeUtils = new ClubTimeUtils(clock, zoneId);
        slotGeneratorService = new SlotGeneratorService(timeUtils);
    }

    @Test
    @DisplayName("Default club hours 06:00 to 23:00 generates 35 slots from 06:00 to 22:00 every 30 mins")
    void testStandardClubHoursSlotGeneration() {
        LocalDate date = LocalDate.of(2026, 10, 8); // Thursday
        Court court = Court.builder().id(UUID.randomUUID()).name("Court 1").build();

        OpeningHours standardHours = OpeningHours.builder()
                .dayOfWeek(DayOfWeek.THURSDAY)
                .openTime(LocalTime.of(6, 0))
                .closeTime(LocalTime.of(23, 0))
                .isClosed(false)
                .build();

        SlotGeneratorService.OperatingWindow window = slotGeneratorService.resolveOperatingWindow(
                court, date, List.of(standardHours)
        );

        assertThat(window.isClosed()).isFalse();
        assertThat(window.openDateTime()).isEqualTo(date.atTime(6, 0));
        assertThat(window.closeDateTime()).isEqualTo(date.atTime(23, 0));

        List<SlotGeneratorService.GeneratedSlot> slots = slotGeneratorService.generateSlots(window);

        // 06:00 to 22:00 inclusive, every 30 mins: (22 - 6) * 2 + 1 = 33 slots!
        assertThat(slots).hasSize(33);
        assertThat(slots.get(0).localStartTime()).isEqualTo(LocalTime.of(6, 0));
        assertThat(slots.get(0).localEndTime()).isEqualTo(LocalTime.of(7, 0));
        assertThat(slots.get(slots.size() - 1).localStartTime()).isEqualTo(LocalTime.of(22, 0));
        assertThat(slots.get(slots.size() - 1).localEndTime()).isEqualTo(LocalTime.of(23, 0));
    }

    @Test
    @DisplayName("Hours crossing midnight: 06:00 to 00:00 generates slots up to 23:00")
    void testHoursCrossingMidnightToZero() {
        LocalDate date = LocalDate.of(2026, 10, 8);
        Court court = Court.builder().id(UUID.randomUUID()).name("Court 1").build();

        OpeningHours hours = OpeningHours.builder()
                .dayOfWeek(DayOfWeek.THURSDAY)
                .openTime(LocalTime.of(6, 0))
                .closeTime(LocalTime.of(0, 0)) // 24:00 midnight
                .isClosed(false)
                .build();

        SlotGeneratorService.OperatingWindow window = slotGeneratorService.resolveOperatingWindow(
                court, date, List.of(hours)
        );

        assertThat(window.isClosed()).isFalse();
        assertThat(window.closeDateTime()).isEqualTo(date.plusDays(1).atTime(0, 0));

        List<SlotGeneratorService.GeneratedSlot> slots = slotGeneratorService.generateSlots(window);

        // 06:00 to 23:00 inclusive = (23 - 6) * 2 + 1 = 35 slots
        assertThat(slots).hasSize(35);
        assertThat(slots.get(slots.size() - 1).localStartTime()).isEqualTo(LocalTime.of(23, 0));
        assertThat(slots.get(slots.size() - 1).localEndTime()).isEqualTo(LocalTime.of(0, 0));
    }

    @Test
    @DisplayName("Night owls: 18:00 to 02:00 next day generates slots until 01:00")
    void testHoursCrossingMidnightToNextMorning() {
        LocalDate date = LocalDate.of(2026, 10, 8);
        Court court = Court.builder().id(UUID.randomUUID()).name("Court 1").build();

        OpeningHours hours = OpeningHours.builder()
                .dayOfWeek(DayOfWeek.THURSDAY)
                .openTime(LocalTime.of(18, 0))
                .closeTime(LocalTime.of(2, 0))
                .isClosed(false)
                .build();

        SlotGeneratorService.OperatingWindow window = slotGeneratorService.resolveOperatingWindow(
                court, date, List.of(hours)
        );

        assertThat(window.isClosed()).isFalse();
        assertThat(window.closeDateTime()).isEqualTo(date.plusDays(1).atTime(2, 0));

        List<SlotGeneratorService.GeneratedSlot> slots = slotGeneratorService.generateSlots(window);
        // 18:00 to 01:00 next day: 7 hours * 2 + 1 = 15 slots
        assertThat(slots).hasSize(15);
        assertThat(slots.get(0).localStartTime()).isEqualTo(LocalTime.of(18, 0));
        assertThat(slots.get(slots.size() - 1).localStartTime()).isEqualTo(LocalTime.of(1, 0));
    }

    @Test
    @DisplayName("Holiday closed exception overrides day of week rule")
    void testHolidayClosedExceptionOverridesRegularHours() {
        LocalDate holidayDate = LocalDate.of(2026, 10, 8);
        Court court = Court.builder().id(UUID.randomUUID()).name("Court 1").build();

        OpeningHours regularThursday = OpeningHours.builder()
                .dayOfWeek(DayOfWeek.THURSDAY)
                .openTime(LocalTime.of(6, 0))
                .closeTime(LocalTime.of(23, 0))
                .isClosed(false)
                .build();

        OpeningHours holidayException = OpeningHours.builder()
                .specificDate(holidayDate)
                .openTime(LocalTime.of(0, 0))
                .closeTime(LocalTime.of(0, 0))
                .isClosed(true)
                .reason("Diwali Festival Holiday")
                .build();

        SlotGeneratorService.OperatingWindow window = slotGeneratorService.resolveOperatingWindow(
                court, holidayDate, List.of(regularThursday, holidayException)
        );

        assertThat(window.isClosed()).isTrue();
        assertThat(window.closureReason()).isEqualTo("Diwali Festival Holiday");

        List<SlotGeneratorService.GeneratedSlot> slots = slotGeneratorService.generateSlots(window);
        assertThat(slots).isEmpty();
    }

    @Test
    @DisplayName("Court-specific hours override club-wide hours")
    void testCourtSpecificHoursOverrideClubWide() {
        LocalDate date = LocalDate.of(2026, 10, 8);
        UUID courtId = UUID.randomUUID();
        Court court = Court.builder().id(courtId).name("Squash Court 1").build();

        OpeningHours clubWide = OpeningHours.builder()
                .dayOfWeek(DayOfWeek.THURSDAY)
                .court(null)
                .openTime(LocalTime.of(6, 0))
                .closeTime(LocalTime.of(23, 0))
                .isClosed(false)
                .build();

        OpeningHours courtSpecific = OpeningHours.builder()
                .dayOfWeek(DayOfWeek.THURSDAY)
                .court(court)
                .openTime(LocalTime.of(8, 0))
                .closeTime(LocalTime.of(20, 0))
                .isClosed(false)
                .build();

        SlotGeneratorService.OperatingWindow window = slotGeneratorService.resolveOperatingWindow(
                court, date, List.of(clubWide, courtSpecific)
        );

        assertThat(window.openDateTime()).isEqualTo(date.atTime(8, 0));
        assertThat(window.closeDateTime()).isEqualTo(date.atTime(20, 0));

        List<SlotGeneratorService.GeneratedSlot> slots = slotGeneratorService.generateSlots(window);
        // 08:00 to 19:00: 11 hours * 2 + 1 = 23 slots
        assertThat(slots).hasSize(23);
        assertThat(slots.get(0).localStartTime()).isEqualTo(LocalTime.of(8, 0));
        assertThat(slots.get(slots.size() - 1).localStartTime()).isEqualTo(LocalTime.of(19, 0));
    }

    @ParameterizedTest(name = "{index} => open={0}, close={1}, expectedSlots={2}")
    @MethodSource("windowArguments")
    @DisplayName("Table-driven test for varied opening and closing windows")
    void testVariedOperatingWindows(LocalTime open, LocalTime close, int expectedSlots) {
        LocalDate date = LocalDate.of(2026, 10, 8);
        OpeningHours hours = OpeningHours.builder()
                .dayOfWeek(DayOfWeek.THURSDAY)
                .openTime(open)
                .closeTime(close)
                .isClosed(false)
                .build();

        SlotGeneratorService.OperatingWindow window = slotGeneratorService.resolveOperatingWindow(
                null, date, List.of(hours)
        );

        List<SlotGeneratorService.GeneratedSlot> slots = slotGeneratorService.generateSlots(window);
        assertThat(slots).hasSize(expectedSlots);
    }

    private static Stream<Arguments> windowArguments() {
        return Stream.of(
                Arguments.of(LocalTime.of(9, 0), LocalTime.of(10, 0), 1),  // Exactly 60 min window = 1 slot (09:00-10:00)
                Arguments.of(LocalTime.of(9, 0), LocalTime.of(10, 30), 2), // 09:00, 09:30
                Arguments.of(LocalTime.of(9, 0), LocalTime.of(11, 0), 3),  // 09:00, 09:30, 10:00
                Arguments.of(LocalTime.of(7, 0), LocalTime.of(12, 0), 9),  // 5 hours = 4*2 + 1 = 9 slots
                Arguments.of(LocalTime.of(10, 0), LocalTime.of(10, 30), 0) // < 60 min window = 0 slots
        );
    }
}
