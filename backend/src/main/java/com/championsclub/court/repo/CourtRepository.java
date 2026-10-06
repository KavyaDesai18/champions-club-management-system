package com.championsclub.court.repo;

import com.championsclub.court.domain.Court;
import com.championsclub.court.domain.SportType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CourtRepository extends JpaRepository<Court, UUID> {
    List<Court> findByIsActiveTrueAndIsDeletedFalse();
    List<Court> findBySportTypeAndIsActiveTrueAndIsDeletedFalse(SportType sportType);
}
