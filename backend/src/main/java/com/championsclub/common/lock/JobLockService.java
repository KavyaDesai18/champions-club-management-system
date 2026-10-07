package com.championsclub.common.lock;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

@Service
public class JobLockService {

    private static final Logger log = LoggerFactory.getLogger(JobLockService.class);

    private final JobExecutionRepository jobExecutionRepository;
    private final Clock clock;

    public JobLockService(JobExecutionRepository jobExecutionRepository, Clock clock) {
        this.jobExecutionRepository = jobExecutionRepository;
        this.clock = clock;
    }

    @Transactional
    public boolean acquireLock(String jobName, String instanceId, Duration lockDuration) {
        Instant now = clock.instant();
        Instant lockedUntil = now.plus(lockDuration);

        // 1. Try to acquire lock on existing job record if it exists and lock is expired
        int updated = jobExecutionRepository.tryAcquireExistingLock(jobName, instanceId, now, lockedUntil);
        if (updated > 0) {
            log.info("Acquired DB lock for job '{}' on instance '{}' until {}", jobName, instanceId, lockedUntil);
            return true;
        }

        // 2. If row doesn't exist yet, try to insert new JobExecution
        if (!jobExecutionRepository.existsById(jobName)) {
            try {
                JobExecution execution = JobExecution.builder()
                        .jobName(jobName)
                        .lockedBy(instanceId)
                        .lockedAt(now)
                        .lockedUntil(lockedUntil)
                        .build();
                jobExecutionRepository.saveAndFlush(execution);
                log.info("Created and acquired initial DB lock for job '{}' on instance '{}'", jobName, instanceId);
                return true;
            } catch (DataIntegrityViolationException e) {
                // Another instance inserted the lock record concurrently
                log.warn("Concurrent lock creation race detected for job '{}'", jobName);
                return false;
            }
        }

        log.debug("Job '{}' is currently locked by another instance or still running", jobName);
        return false;
    }

    @Transactional
    public void recordSuccess(String jobName, String instanceId, long durationMs) {
        Instant now = clock.instant();
        jobExecutionRepository.recordSuccess(jobName, instanceId, now, durationMs);
        log.info("Job '{}' completed successfully in {} ms by instance '{}'", jobName, durationMs, instanceId);
    }

    @Transactional
    public void recordFailure(String jobName, String instanceId) {
        Instant now = clock.instant();
        jobExecutionRepository.recordFailure(jobName, instanceId, now);
        log.warn("Job '{}' marked as failed by instance '{}'", jobName, instanceId);
    }
}
