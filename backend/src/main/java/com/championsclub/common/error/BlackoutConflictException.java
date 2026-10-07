package com.championsclub.common.error;

import com.championsclub.court.dto.ConflictingBookingDto;
import org.springframework.http.HttpStatus;

import java.util.Collections;
import java.util.List;

public class BlackoutConflictException extends ChampionsClubException {

    private final List<ConflictingBookingDto> conflictingBookings;

    public BlackoutConflictException(String message, List<ConflictingBookingDto> conflictingBookings) {
        super(message, HttpStatus.CONFLICT, "BLACKOUT_BOOKING_CONFLICT");
        this.conflictingBookings = conflictingBookings != null ? conflictingBookings : Collections.emptyList();
    }

    public List<ConflictingBookingDto> getConflictingBookings() {
        return conflictingBookings;
    }
}
