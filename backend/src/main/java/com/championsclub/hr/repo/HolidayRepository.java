package com.championsclub.hr.repo;

import com.championsclub.hr.domain.Holiday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface HolidayRepository extends JpaRepository<Holiday, UUID> {

    List<Holiday> findByHolidayDateBetweenOrderByHolidayDateAsc(LocalDate from, LocalDate to);

    boolean existsByHolidayDate(LocalDate date);

    Optional<Holiday> findByHolidayDate(LocalDate date);

    List<Holiday> findAllByOrderByHolidayDateAsc();
}
