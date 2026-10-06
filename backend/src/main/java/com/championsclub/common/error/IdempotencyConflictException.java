package com.championsclub.common.error;

import org.springframework.http.HttpStatus;

public class IdempotencyConflictException extends ChampionsClubException {
    public IdempotencyConflictException(String message) {
        super(message, HttpStatus.CONFLICT, "IDEMPOTENCY_CONFLICT");
    }
}
