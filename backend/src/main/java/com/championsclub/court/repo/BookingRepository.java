package com.championsclub.court.repo;

import com.championsclub.court.domain.Booking;
import com.championsclub.court.domain.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BookingRepository extends JpaRepository<Booking, UUID> {

    Optional<Booking> findByIdempotencyKey(String idempotencyKey);

    List<Booking> findByUserIdAndIsDeletedFalseOrderByStartTimeDesc(UUID userId);

    @Query("SELECT COUNT(b) FROM Booking b WHERE b.user.id = :userId " +
           "AND b.startTime >= :startOfDay AND b.startTime < :endOfDay " +
           "AND b.status != :cancelledStatus AND b.isDeleted = false")
    long countBookingsForUserInDateRange(
            @Param("userId") UUID userId,
            @Param("startOfDay") Instant startOfDay,
            @Param("endOfDay") Instant endOfDay,
            @Param("cancelledStatus") BookingStatus cancelledStatus
    );

    @Query("SELECT b FROM Booking b WHERE b.court.id = :courtId " +
           "AND b.startTime < :endTime AND b.endTime > :startTime " +
           "AND b.status != :cancelledStatus AND b.isDeleted = false")
    List<Booking> findConflictingBookings(
            @Param("courtId") UUID courtId,
            @Param("startTime") Instant startTime,
            @Param("endTime") Instant endTime,
            @Param("cancelledStatus") BookingStatus cancelledStatus
    );
}
