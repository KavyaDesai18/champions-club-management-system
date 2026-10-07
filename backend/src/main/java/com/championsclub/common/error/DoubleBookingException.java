package com.championsclub.common.error;

import org.springframework.http.HttpStatus;

public class DoubleBookingException extends ChampionsClubException {
    public DoubleBookingException(String message) {
        super(message, HttpStatus.CONFLICT, "SLOT_TAKEN");
    }
}
