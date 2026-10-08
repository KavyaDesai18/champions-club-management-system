package com.championsclub.shop.exception;

import com.championsclub.common.error.ChampionsClubException;
import org.springframework.http.HttpStatus;

public class InsufficientStockException extends ChampionsClubException {
    public InsufficientStockException(String message) {
        super(message, HttpStatus.CONFLICT, "INSUFFICIENT_STOCK");
    }
}
