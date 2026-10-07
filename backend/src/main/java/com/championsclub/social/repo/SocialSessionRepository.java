package com.championsclub.social.repo;

import com.championsclub.social.domain.SocialSession;
import com.championsclub.social.domain.SocialSessionStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SocialSessionRepository extends JpaRepository<SocialSession, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM SocialSession s WHERE s.id = :id")
    Optional<SocialSession> findByIdWithLock(@Param("id") UUID id);

    List<SocialSession> findByStatusAndStartAtAfterOrderByStartAtAsc(SocialSessionStatus status, Instant after);

    List<SocialSession> findByStartAtBetweenOrderByStartAtAsc(Instant start, Instant end);

    @Query("SELECT s FROM SocialSession s WHERE (:sportId IS NULL OR s.sport.id = :sportId) " +
           "AND (:courtId IS NULL OR s.court.id = :courtId) " +
           "AND (:status IS NULL OR s.status = :status) " +
           "AND s.startAt >= :start AND s.startAt <= :end " +
           "ORDER BY s.startAt ASC")
    List<SocialSession> findFiltered(
            @Param("sportId") UUID sportId,
            @Param("courtId") UUID courtId,
            @Param("status") SocialSessionStatus status,
            @Param("start") Instant start,
            @Param("end") Instant end
    );

    List<SocialSession> findByParentSeriesIdAndStartAtAfterAndStatusOrderByStartAtAsc(
            UUID parentSeriesId, Instant after, SocialSessionStatus status
    );

    List<SocialSession> findByParentSeriesIdOrderByStartAtAsc(UUID parentSeriesId);

    @Query("SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END FROM SocialSession s " +
           "WHERE s.court.id = :courtId " +
           "AND s.status = 'SCHEDULED' " +
           "AND s.startAt < :end AND s.endAt > :start")
    boolean existsOverlapping(
            @Param("courtId") UUID courtId,
            @Param("start") Instant start,
            @Param("end") Instant end
    );

    @Query("SELECT s FROM SocialSession s WHERE s.status = 'SCHEDULED' " +
           "AND s.startAt >= :windowStart AND s.startAt <= :windowEnd")
    List<SocialSession> findUpcomingSessionsInWindow(
            @Param("windowStart") Instant windowStart,
            @Param("windowEnd") Instant windowEnd
    );

    @Query("SELECT s FROM SocialSession s WHERE s.status = 'SCHEDULED' AND s.endAt <= :now")
    List<SocialSession> findPastScheduledSessions(@Param("now") Instant now);
}
