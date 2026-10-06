package com.championsclub.common.idempotency;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

@Service
public class IdempotencyService {

    private final IdempotencyRepository repository;
    private final Clock clock;

    public IdempotencyService(IdempotencyRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public Optional<IdempotencyRecord> getExisting(String key) {
        if (key == null || key.isBlank()) {
            return Optional.empty();
        }
        return repository.findByIdempotencyKey(key)
                .filter(record -> record.getExpiresAt().isAfter(clock.instant()));
    }

    @Transactional
    public void recordResponse(String key, String path, String method, int statusCode, String responseBody) {
        if (key == null || key.isBlank()) {
            return;
        }
        Instant now = clock.instant();
        IdempotencyRecord record = IdempotencyRecord.builder()
                .idempotencyKey(key)
                .endpointPath(path)
                .httpMethod(method)
                .statusCode(statusCode)
                .responseBody(responseBody)
                .createdAt(now)
                .expiresAt(now.plus(Duration.ofHours(24)))
                .build();
        repository.save(record);
    }
}
