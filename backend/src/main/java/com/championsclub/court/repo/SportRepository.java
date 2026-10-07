package com.championsclub.court.repo;

import com.championsclub.court.domain.Sport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SportRepository extends JpaRepository<Sport, UUID> {
    Optional<Sport> findByNameIgnoreCaseAndIsDeletedFalse(String name);
    List<Sport> findByIsActiveTrueAndIsDeletedFalseOrderByNameAsc();
    List<Sport> findAllByIsDeletedFalseOrderByNameAsc();
}
