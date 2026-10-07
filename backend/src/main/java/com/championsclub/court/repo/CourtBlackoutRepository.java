package com.championsclub.court.repo;

import com.championsclub.court.domain.CourtBlackout;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface CourtBlackoutRepository extends JpaRepository<CourtBlackout, UUID> {

    @Query("SELECT cb FROM CourtBlackout cb WHERE cb.court.id = :courtId " +
           "AND cb.startTime < :endTime AND cb.endTime > :startTime " +
           "AND cb.isDeleted = false")
    List<CourtBlackout> findOverlappingBlackouts(
            @Param("courtId") UUID courtId,
            @Param("startTime") Instant startTime,
            @Param("endTime") Instant endTime
    );

    @Query("SELECT CASE WHEN COUNT(cb) > 0 THEN true ELSE false END FROM CourtBlackout cb " +
           "WHERE cb.court.id = :courtId AND cb.startTime < :endTime AND cb.endTime > :startTime AND cb.isDeleted = false")
    boolean existsOverlapping(
            @Param("courtId") UUID courtId,
            @Param("startTime") Instant startTime,
            @Param("endTime") Instant endTime
    );

    @Query("SELECT cb FROM CourtBlackout cb WHERE cb.court.id IN :courtIds " +
           "AND cb.startTime < :endTime AND cb.endTime > :startTime " +
           "AND cb.isDeleted = false")
    List<CourtBlackout> findOverlappingBlackoutsForCourts(
            @Param("courtIds") List<UUID> courtIds,
            @Param("startTime") Instant startTime,
            @Param("endTime") Instant endTime
    );

    List<CourtBlackout> findAllByIsDeletedFalseOrderByStartTimeDesc();

    List<CourtBlackout> findByCourtIdAndIsDeletedFalseOrderByStartTimeDesc(UUID courtId);
}
