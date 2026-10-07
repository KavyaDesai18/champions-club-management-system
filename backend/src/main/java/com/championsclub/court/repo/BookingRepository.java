package com.championsclub.court.repo;

import com.championsclub.court.domain.Booking;
import com.championsclub.court.domain.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BookingRepository extends JpaRepository<Booking, UUID> {

    Optional<Booking> findByIdempotencyKey(String idempotencyKey);

    @Query("SELECT b FROM Booking b WHERE b.user.id = :userId AND b.isDeleted = false ORDER BY b.startAt DESC")
    List<Booking> findByUserIdAndIsDeletedFalseOrderByStartTimeDesc(@Param("userId") UUID userId);

    @Query("SELECT b FROM Booking b WHERE (b.member.id = :memberId OR b.user.id = :userId) AND b.isDeleted = false ORDER BY b.startAt DESC")
    List<Booking> findByMemberOrUserOrderByStartAtDesc(@Param("memberId") UUID memberId, @Param("userId") UUID userId);

    @Query("SELECT COUNT(b) FROM Booking b WHERE (b.member.id = :memberId OR (b.member IS NULL AND b.user.id = :userId)) " +
           "AND b.startAt >= :startOfDay AND b.startAt < :endOfDay " +
           "AND b.status IN :countedStatuses AND b.isDeleted = false")
    long countBookingsForMemberInDateRange(
            @Param("memberId") UUID memberId,
            @Param("userId") UUID userId,
            @Param("startOfDay") Instant startOfDay,
            @Param("endOfDay") Instant endOfDay,
            @Param("countedStatuses") Collection<BookingStatus> countedStatuses
    );

    @Query("SELECT b FROM Booking b WHERE (b.member.id = :memberId OR (b.member IS NULL AND b.user.id = :userId)) " +
           "AND b.startAt < :endTime AND b.endAt > :startTime " +
           "AND b.status IN :activeStatuses AND b.isDeleted = false")
    List<Booking> findOverlappingBookingsForMember(
            @Param("memberId") UUID memberId,
            @Param("userId") UUID userId,
            @Param("startTime") Instant startTime,
            @Param("endTime") Instant endTime,
            @Param("activeStatuses") Collection<BookingStatus> activeStatuses
    );

    @Query("SELECT b FROM Booking b WHERE b.court.id = :courtId " +
           "AND b.startAt < :endTime AND b.endAt > :startTime " +
           "AND b.status != :cancelledStatus AND b.isDeleted = false")
    List<Booking> findConflictingBookings(
            @Param("courtId") UUID courtId,
            @Param("startTime") Instant startTime,
            @Param("endTime") Instant endTime,
            @Param("cancelledStatus") BookingStatus cancelledStatus
    );

    @Query("SELECT b FROM Booking b WHERE b.court.id IN :courtIds " +
           "AND b.startAt < :endTime AND b.endAt > :startTime " +
           "AND b.status != :cancelledStatus AND b.isDeleted = false")
    List<Booking> findActiveBookingsForCourtsInWindow(
            @Param("courtIds") List<UUID> courtIds,
            @Param("startTime") Instant startTime,
            @Param("endTime") Instant endTime,
            @Param("cancelledStatus") BookingStatus cancelledStatus
    );

    @Query("SELECT b FROM Booking b WHERE b.court.id = :courtId " +
           "AND b.endAt > :now " +
           "AND b.status != :cancelledStatus AND b.isDeleted = false " +
           "ORDER BY b.startAt ASC")
    List<Booking> findFutureActiveBookingsForCourt(
            @Param("courtId") UUID courtId,
            @Param("now") Instant now,
            @Param("cancelledStatus") BookingStatus cancelledStatus
    );

    @Query("SELECT b FROM Booking b WHERE b.status = 'HELD' AND b.holdExpiresAt < :now AND b.isDeleted = false")
    List<Booking> findExpiredHolds(@Param("now") Instant now);

    @Query("SELECT b FROM Booking b WHERE b.status = 'CONFIRMED' AND b.endAt < :now AND b.isDeleted = false")
    List<Booking> findCompletedBookingsToArchive(@Param("now") Instant now);

    @Query("SELECT b FROM Booking b WHERE b.isDeleted = false " +
           "AND (:courtId IS NULL OR b.court.id = :courtId) " +
           "AND (:status IS NULL OR b.status = :status) " +
           "AND (:fromTime IS NULL OR b.startAt >= :fromTime) " +
           "AND (:toTime IS NULL OR b.startAt <= :toTime) " +
           "ORDER BY b.startAt DESC")
    List<Booking> findBookingsWithFilters(
            @Param("courtId") UUID courtId,
            @Param("status") BookingStatus status,
            @Param("fromTime") Instant fromTime,
            @Param("toTime") Instant toTime
    );
}
