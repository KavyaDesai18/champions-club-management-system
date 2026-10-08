package com.championsclub.shop.exception;

import com.championsclub.common.error.ChampionsClubException;
import org.springframework.http.HttpStatus;

public class DuplicateSkuException extends ChampionsClubException {
    public DuplicateSkuException(String message) {
        super(message, HttpStatus.CONFLICT, "DUPLICATE_SKU");
    }
}
