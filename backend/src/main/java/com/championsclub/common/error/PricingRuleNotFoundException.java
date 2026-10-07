package com.championsclub.common.error;

import org.springframework.http.HttpStatus;

public class PricingRuleNotFoundException extends ChampionsClubException {

    public PricingRuleNotFoundException(String message) {
        super(message, HttpStatus.UNPROCESSABLE_ENTITY, "PRICING_RULE_NOT_FOUND");
    }
}
