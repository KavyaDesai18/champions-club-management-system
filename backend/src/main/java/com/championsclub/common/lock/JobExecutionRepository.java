package com.championsclub.common.lock;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;

@Repository
public interface JobExecutionRepository extends JpaRepository<JobExecution, String> {

    @Modifying
    @Query("""
        UPDATE JobExecution j
        SET j.lockedBy = :lockedBy,
            j.lockedAt = :now,
            j.lockedUntil = :lockedUntil
        WHERE j.jobName = :jobName AND (j.lockedUntil IS NULL OR j.lockedUntil <= :now)
    """)
    int tryAcquireExistingLock(
            @Param("jobName") String jobName,
            @Param("lockedBy") String lockedBy,
            @Param("now") Instant now,
            @Param("lockedUntil") Instant lockedUntil
    );

    @Modifying
    @Query("""
        UPDATE JobExecution j
        SET j.lockedUntil = :now,
            j.lastSuccessAt = :now,
            j.lastRunDurationMs = :durationMs
        WHERE j.jobName = :jobName AND j.lockedBy = :lockedBy
    """)
    int recordSuccess(
            @Param("jobName") String jobName,
            @Param("lockedBy") String lockedBy,
            @Param("now") Instant now,
            @Param("durationMs") Long durationMs
    );

    @Modifying
    @Query("""
        UPDATE JobExecution j
        SET j.lockedUntil = :now,
            j.lastFailureAt = :now
        WHERE j.jobName = :jobName AND j.lockedBy = :lockedBy
    """)
    int recordFailure(
            @Param("jobName") String jobName,
            @Param("lockedBy") String lockedBy,
            @Param("now") Instant now
    );
}
