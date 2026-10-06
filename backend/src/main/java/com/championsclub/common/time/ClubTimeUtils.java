package com.championsclub.common.time;

import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;

@Component
public class ClubTimeUtils {

    private final Clock clock;
    private final ZoneId clubZoneId;

    public ClubTimeUtils(Clock clock, ZoneId clubZoneId) {
        this.clock = clock;
        this.clubZoneId = clubZoneId;
    }

    public Instant now() {
        return clock.instant();
    }

    public LocalDate currentClubDate() {
        return toClubLocalDate(clock.instant());
    }

    public LocalDate toClubLocalDate(Instant instant) {
        return instant.atZone(clubZoneId).toLocalDate();
    }

    public Instant startOfDayInClub(LocalDate date) {
        return date.atStartOfDay(clubZoneId).toInstant();
    }

    public Instant endOfDayInClub(LocalDate date) {
        return date.plusDays(1).atStartOfDay(clubZoneId).toInstant().minusNanos(1);
    }

    public ZoneId getClubZoneId() {
        return clubZoneId;
    }
}
