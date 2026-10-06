package com.championsclub.common.audit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.UUID;

@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final AuditLogRepository auditLogRepository;
    private final Clock clock;

    public AuditService(AuditLogRepository auditLogRepository, Clock clock) {
        this.auditLogRepository = auditLogRepository;
        this.clock = clock;
    }

    @Transactional
    public void record(UUID userId, String action, String entityType, String entityId, String details, String ipAddress) {
        AuditLog auditLog = AuditLog.builder()
                .userId(userId)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .details(details)
                .ipAddress(ipAddress)
                .createdAt(clock.instant())
                .build();
        auditLogRepository.save(auditLog);
        log.info("Audit recorded: action={}, entityType={}, entityId={}", action, entityType, entityId);
    }

    @Transactional
    public void log(String action, String details, String actor, UUID entityId) {
        AuditLog auditLog = AuditLog.builder()
                .userId(null)
                .action(action)
                .entityType("MEMBER")
                .entityId(entityId != null ? entityId.toString() : null)
                .details(details + (actor != null ? " [Actor: " + actor + "]" : ""))
                .ipAddress("127.0.0.1")
                .createdAt(clock.instant())
                .build();
        auditLogRepository.save(auditLog);
        log.info("Audit recorded: action={}, details={}", action, details);
    }
}
