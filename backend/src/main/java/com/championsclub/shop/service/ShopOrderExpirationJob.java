package com.championsclub.shop.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
@RequiredArgsConstructor
@Slf4j
public class ShopOrderExpirationJob {

    private final ShopOrderService shopOrderService;

    /**
     * Runs every minute to automatically release stock reservations for orders in PLACED state
     * that haven't received payment within 15 minutes.
     */
    @Scheduled(fixedRate = 60000)
    public void processExpiredPlacedOrders() {
        Instant cutoff = Instant.now().minus(15, ChronoUnit.MINUTES);
        int expiredCount = shopOrderService.expirePlacedOrders(cutoff);
        if (expiredCount > 0) {
            log.info("ShopOrderExpirationJob: Released reservations for {} expired placed order(s)", expiredCount);
        }
    }

    /**
     * Testable manual invocation hook.
     */
    public int runExpirationWithCutoff(Instant cutoff) {
        return shopOrderService.expirePlacedOrders(cutoff);
    }
}
