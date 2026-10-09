package com.championsclub.common.error;

import org.springframework.http.HttpStatus;

public class BadRequestException extends ChampionsClubException {
    public BadRequestException(String message) {
        super(message, HttpStatus.BAD_REQUEST, "BAD_REQUEST");
    }

    public BadRequestException(String message, String code) {
        super(message, HttpStatus.BAD_REQUEST, code);
    }
}
