package com.championsclub.bar.repo;

import com.championsclub.bar.domain.Shift;
import com.championsclub.bar.domain.ShiftStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ShiftRepository extends JpaRepository<Shift, UUID> {

    Optional<Shift> findFirstByStaffUserIdAndStatusOrderByStartTimeDesc(UUID staffUserId, ShiftStatus status);

    Optional<Shift> findFirstByStationAndStatusOrderByStartTimeDesc(String station, ShiftStatus status);

    List<Shift> findAllByStatusOrderByStartTimeDesc(ShiftStatus status);

    List<Shift> findAllByStartTimeBetweenOrderByStartTimeDesc(Instant start, Instant end);
}
