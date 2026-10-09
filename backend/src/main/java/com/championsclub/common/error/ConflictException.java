package com.championsclub.common.error;

import org.springframework.http.HttpStatus;

public class ConflictException extends ChampionsClubException {
    public ConflictException(String message) {
        super(message, HttpStatus.CONFLICT, "CONFLICT");
    }

    public ConflictException(String message, String code) {
        super(message, HttpStatus.CONFLICT, code);
    }
}
