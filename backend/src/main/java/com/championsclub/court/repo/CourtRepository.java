package com.championsclub.court.repo;

import com.championsclub.court.domain.Court;
import com.championsclub.court.domain.CourtStatus;
import com.championsclub.court.domain.SportType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CourtRepository extends JpaRepository<Court, UUID> {
    List<Court> findByIsActiveTrueAndIsDeletedFalse();
    List<Court> findBySportTypeAndIsActiveTrueAndIsDeletedFalse(SportType sportType);

    @Query("SELECT c FROM Court c WHERE (c.sport.id = :sportId OR (:sportId IS NULL AND c.isDeleted = false)) " +
           "AND c.isDeleted = false ORDER BY c.name ASC")
    List<Court> findBySportIdAndIsDeletedFalse(@Param("sportId") UUID sportId);

    @Query("SELECT c FROM Court c WHERE c.sport.id = :sportId AND c.isActive = true AND c.isDeleted = false ORDER BY c.name ASC")
    List<Court> findActiveCourtsBySportId(@Param("sportId") UUID sportId);

    List<Court> findAllByIsDeletedFalseOrderByNameAsc();

    long countByStatusAndIsDeletedFalse(CourtStatus status);
}
