package com.championsclub.common.error;

import org.springframework.http.HttpStatus;

public class BusinessValidationException extends ChampionsClubException {
    public BusinessValidationException(String message) {
        super(message, HttpStatus.BAD_REQUEST, "BUSINESS_VALIDATION_ERROR");
    }

    public BusinessValidationException(String message, String code) {
        super(message, HttpStatus.BAD_REQUEST, code);
    }
}
