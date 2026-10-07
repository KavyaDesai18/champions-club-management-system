package com.championsclub.court.service;

import com.championsclub.common.time.ClubTimeUtils;
import com.championsclub.court.domain.Court;
import com.championsclub.court.domain.OpeningHours;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class SlotGeneratorService {

    public static final Duration SLOT_INTERVAL = Duration.ofMinutes(30);
    public static final Duration SESSION_DURATION = Duration.ofMinutes(60);

    private final ClubTimeUtils timeUtils;

    public SlotGeneratorService(ClubTimeUtils timeUtils) {
        this.timeUtils = timeUtils;
    }

    public record GeneratedSlot(
            Instant startTime,
            Instant endTime,
            LocalTime localStartTime,
            LocalTime localEndTime
    ) {}

    public record OperatingWindow(
            boolean isClosed,
            String closureReason,
            LocalDateTime openDateTime,
            LocalDateTime closeDateTime
    ) {}

    /**
     * Resolves the operating window for a court on a given date.
     * Specific-date exceptions beat day-of-week rules.
     * Court-specific rules beat club-wide rules.
     */
    public OperatingWindow resolveOperatingWindow(
            Court court,
            LocalDate date,
            List<OpeningHours> applicableRules
    ) {
        DayOfWeek dayOfWeek = date.getDayOfWeek();
        UUID courtId = court != null ? court.getId() : null;

        OpeningHours bestRule = null;
        int bestScore = -1;

        for (OpeningHours rule : applicableRules) {
            if (rule.isDeleted()) {
                continue;
            }

            // Check applicability to date
            boolean matchesSpecificDate = date.equals(rule.getSpecificDate());
            boolean matchesDayOfWeek = (rule.getSpecificDate() == null && rule.getDayOfWeek() == dayOfWeek);

            if (!matchesSpecificDate && !matchesDayOfWeek) {
                continue;
            }

            // Check court scope
            boolean matchesCourt = (courtId != null && rule.getCourt() != null && courtId.equals(rule.getCourt().getId()));
            boolean isClubWide = (rule.getCourt() == null);

            if (!matchesCourt && !isClubWide) {
                continue;
            }

            // Scoring:
            // Court + Specific Date: 40
            // ClubWide + Specific Date: 30
            // Court + DayOfWeek: 20
            // ClubWide + DayOfWeek: 10
            int score = (matchesCourt ? 20 : 10) + (matchesSpecificDate ? 20 : 0);
            if (score > bestScore) {
                bestScore = score;
                bestRule = rule;
            }
        }

        if (bestRule == null) {
            // Default club hours: 06:00 to 23:00
            return new OperatingWindow(
                    false,
                    null,
                    date.atTime(6, 0),
                    date.atTime(23, 0)
            );
        }

        if (bestRule.isClosed()) {
            return new OperatingWindow(
                    true,
                    bestRule.getReason() != null ? bestRule.getReason() : "Facility Closed",
                    null,
                    null
            );
        }

        LocalTime openTime = bestRule.getOpenTime();
        LocalTime closeTime = bestRule.getCloseTime();

        LocalDateTime openDateTime = date.atTime(openTime);
        LocalDateTime closeDateTime;

        // Crossing midnight handling:
        // e.g. 06:00 to 00:00 (midnight of next day)
        // or 18:00 to 02:00 (2 AM of next day)
        if (closeTime.equals(LocalTime.MIN) || closeTime.isBefore(openTime)) {
            closeDateTime = date.plusDays(1).atTime(closeTime);
        } else {
            closeDateTime = date.atTime(closeTime);
        }

        return new OperatingWindow(false, null, openDateTime, closeDateTime);
    }

    /**
     * Generates slots spaced 30 minutes apart, each 60 minutes long,
     * where the last slot starts at closing minus 60 minutes.
     */
    public List<GeneratedSlot> generateSlots(OperatingWindow window) {
        List<GeneratedSlot> slots = new ArrayList<>();
        if (window.isClosed() || window.openDateTime() == null || window.closeDateTime() == null) {
            return slots;
        }

        ZoneId clubZone = timeUtils.getClubZoneId();
        LocalDateTime latestStart = window.closeDateTime().minus(SESSION_DURATION);

        LocalDateTime current = window.openDateTime();
        while (!current.isAfter(latestStart)) {
            LocalDateTime end = current.plus(SESSION_DURATION);

            ZonedDateTime startZdt = current.atZone(clubZone);
            ZonedDateTime endZdt = end.atZone(clubZone);

            slots.add(new GeneratedSlot(
                    startZdt.toInstant(),
                    endZdt.toInstant(),
                    current.toLocalTime(),
                    end.toLocalTime()
            ));

            current = current.plus(SLOT_INTERVAL);
        }

        return slots;
    }
}
