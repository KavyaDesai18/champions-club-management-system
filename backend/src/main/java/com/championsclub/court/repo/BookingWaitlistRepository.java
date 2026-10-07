package com.championsclub.court.repo;

import com.championsclub.court.domain.BookingWaitlist;
import com.championsclub.court.domain.WaitlistStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BookingWaitlistRepository extends JpaRepository<BookingWaitlist, UUID> {

    @Query("SELECT w FROM BookingWaitlist w WHERE w.court.id = :courtId " +
           "AND w.startAt = :startAt AND w.status = :status " +
           "ORDER BY w.createdAt ASC")
    List<BookingWaitlist> findActiveWaitlistForSlot(
            @Param("courtId") UUID courtId,
            @Param("startAt") Instant startAt,
            @Param("status") WaitlistStatus status
    );

    List<BookingWaitlist> findByMemberIdOrderByCreatedAtDesc(UUID memberId);

    Optional<BookingWaitlist> findByCourtIdAndStartAtAndMemberIdAndStatus(
            UUID courtId, Instant startAt, UUID memberId, WaitlistStatus status
    );

    @Query("SELECT w FROM BookingWaitlist w WHERE w.status = 'OFFERED' AND w.holdExpiresAt < :now")
    List<BookingWaitlist> findExpiredOfferedEntries(@Param("now") Instant now);
}
