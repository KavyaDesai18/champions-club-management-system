package com.championsclub.common.error;

import org.springframework.http.HttpStatus;

public class ChampionsClubException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public ChampionsClubException(String message, HttpStatus status, String code) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public ChampionsClubException(String message, HttpStatus status, String code, Throwable cause) {
        super(message, cause);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }
}
