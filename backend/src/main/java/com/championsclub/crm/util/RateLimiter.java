package com.championsclub.crm.util;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;

@Component
public class RateLimiter {

    private final ConcurrentHashMap<String, ConcurrentLinkedQueue<Instant>> requestMap = new ConcurrentHashMap<>();
    private static final int DEFAULT_LIMIT_PER_MINUTE = 15;
    private static final long WINDOW_SECONDS = 60;

    public boolean tryAcquire(String clientKey) {
        return tryAcquire(clientKey, DEFAULT_LIMIT_PER_MINUTE);
    }

    public boolean tryAcquire(String clientKey, int maxRequestsPerMinute) {
        if (clientKey == null || clientKey.isBlank()) {
            clientKey = "unknown";
        }
        Instant now = Instant.now();
        Instant windowStart = now.minusSeconds(WINDOW_SECONDS);

        ConcurrentLinkedQueue<Instant> queue = requestMap.computeIfAbsent(clientKey, k -> new ConcurrentLinkedQueue<>());

        // Evict expired entries
        while (!queue.isEmpty() && queue.peek().isBefore(windowStart)) {
            queue.poll();
        }

        if (queue.size() >= maxRequestsPerMinute) {
            return false;
        }

        queue.add(now);
        return true;
    }

    public void clear() {
        requestMap.clear();
    }
}
