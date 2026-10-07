package com.championsclub.court.repo;

import com.championsclub.court.domain.OpeningHours;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface OpeningHoursRepository extends JpaRepository<OpeningHours, UUID> {

    @Query("SELECT oh FROM OpeningHours oh WHERE oh.isDeleted = false " +
           "AND (oh.specificDate = :date OR (oh.specificDate IS NULL AND oh.dayOfWeek = :dayOfWeek)) " +
           "AND (oh.court.id IN :courtIds OR oh.court IS NULL)")
    List<OpeningHours> findRulesForDateAndCourts(
            @Param("date") LocalDate date,
            @Param("dayOfWeek") DayOfWeek dayOfWeek,
            @Param("courtIds") List<UUID> courtIds
    );

    @Query("SELECT oh FROM OpeningHours oh WHERE oh.isDeleted = false " +
           "AND (oh.specificDate = :date OR (oh.specificDate IS NULL AND oh.dayOfWeek = :dayOfWeek))")
    List<OpeningHours> findRulesForDate(
            @Param("date") LocalDate date,
            @Param("dayOfWeek") DayOfWeek dayOfWeek
    );

    List<OpeningHours> findAllByIsDeletedFalseOrderBySpecificDateAscDayOfWeekAsc();

    List<OpeningHours> findByCourtIdAndIsDeletedFalse(UUID courtId);
}
