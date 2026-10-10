package com.championsclub.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Token bucket rate limiting filter for sensitive auth and public endpoints.
 * Returns HTTP 429 Too Many Requests when request quotas are exceeded.
 */
public class RateLimitingFilter extends OncePerRequestFilter {

    private final boolean enabled;
    private final int authMaxRequestsPerMinute;
    private final int generalMaxRequestsPerMinute;

    private final Map<String, TokenBucket> authBuckets = new ConcurrentHashMap<>();
    private final Map<String, TokenBucket> generalBuckets = new ConcurrentHashMap<>();

    public RateLimitingFilter(
            @Value("${app.rate-limit.enabled:true}") boolean enabled,
            @Value("${app.rate-limit.auth-rpm:60}") int authMaxRequestsPerMinute,
            @Value("${app.rate-limit.general-rpm:300}") int generalMaxRequestsPerMinute
    ) {
        this.enabled = enabled;
        this.authMaxRequestsPerMinute = authMaxRequestsPerMinute;
        this.generalMaxRequestsPerMinute = generalMaxRequestsPerMinute;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        if (!enabled) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();

        // Skip internal/static/actuator/swagger paths
        if (path.startsWith("/actuator") || path.startsWith("/swagger-ui") || path.startsWith("/v3/api-docs")) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = resolveClientIp(request);
        boolean isAuthEndpoint = path.contains("/auth/login") || path.contains("/auth/forgot-password") || path.contains("/auth/reset-password");

        boolean allowed;
        if (isAuthEndpoint) {
            TokenBucket bucket = authBuckets.computeIfAbsent(clientIp, k -> new TokenBucket(authMaxRequestsPerMinute, 60));
            allowed = bucket.tryConsume();
        } else {
            TokenBucket bucket = generalBuckets.computeIfAbsent(clientIp, k -> new TokenBucket(generalMaxRequestsPerMinute, 60));
            allowed = bucket.tryConsume();
        }

        if (!allowed) {
            response.setStatus(429);
            response.setHeader("Retry-After", "60");
            response.setContentType("application/json");
            response.getWriter().write("""
                {"status":429,"code":"TOO_MANY_REQUESTS","message":"Rate limit exceeded. Please wait and try again."}
            """.trim());
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String resolveClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown-ip";
    }

    /**
     * Simple thread-safe token bucket implementation
     */
    private static class TokenBucket {
        private final int capacity;
        private final double refillRatePerSecond;
        private double tokens;
        private long lastRefillTimestamp;

        public TokenBucket(int capacity, int refillPeriodSeconds) {
            this.capacity = capacity;
            this.refillRatePerSecond = (double) capacity / refillPeriodSeconds;
            this.tokens = capacity;
            this.lastRefillTimestamp = Instant.now().getEpochSecond();
        }

        public synchronized boolean tryConsume() {
            refill();
            if (tokens >= 1.0) {
                tokens -= 1.0;
                return true;
            }
            return false;
        }

        private void refill() {
            long now = Instant.now().getEpochSecond();
            long elapsed = now - lastRefillTimestamp;
            if (elapsed > 0) {
                tokens = Math.min(capacity, tokens + (elapsed * refillRatePerSecond));
                lastRefillTimestamp = now;
            }
        }
    }
}
