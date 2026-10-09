package com.championsclub.common.error;

import org.springframework.http.HttpStatus;

public class ForbiddenException extends ChampionsClubException {
    public ForbiddenException(String message) {
        super(message, HttpStatus.FORBIDDEN, "FORBIDDEN");
    }

    public ForbiddenException(String message, String code) {
        super(message, HttpStatus.FORBIDDEN, code);
    }
}
