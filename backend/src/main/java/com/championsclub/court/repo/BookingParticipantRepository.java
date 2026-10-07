package com.championsclub.court.repo;

import com.championsclub.court.domain.BookingParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BookingParticipantRepository extends JpaRepository<BookingParticipant, UUID> {
    List<BookingParticipant> findByBookingId(UUID bookingId);
}
