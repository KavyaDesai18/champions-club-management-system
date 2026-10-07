package com.championsclub.court.repo;

import com.championsclub.court.domain.SlotHold;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SlotHoldRepository extends JpaRepository<SlotHold, UUID> {

    @Query("SELECT sh FROM SlotHold sh WHERE sh.court.id = :courtId " +
           "AND sh.startTime < :endTime AND sh.endTime > :startTime " +
           "AND sh.expiresAt > :now")
    List<SlotHold> findActiveHoldsForCourt(
            @Param("courtId") UUID courtId,
            @Param("startTime") Instant startTime,
            @Param("endTime") Instant endTime,
            @Param("now") Instant now
    );

    @Query("SELECT sh FROM SlotHold sh WHERE sh.court.id IN :courtIds " +
           "AND sh.startTime < :endTime AND sh.endTime > :startTime " +
           "AND sh.expiresAt > :now")
    List<SlotHold> findActiveHoldsForCourts(
            @Param("courtIds") List<UUID> courtIds,
            @Param("startTime") Instant startTime,
            @Param("endTime") Instant endTime,
            @Param("now") Instant now
    );

    Optional<SlotHold> findByHoldTokenAndExpiresAtAfter(String holdToken, Instant now);

    @Modifying
    @Query("DELETE FROM SlotHold sh WHERE sh.expiresAt <= :now")
    int purgeExpiredHolds(@Param("now") Instant now);
}
