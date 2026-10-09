package com.championsclub.bar.repo;

import com.championsclub.bar.domain.BarTable;
import com.championsclub.bar.domain.TableStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BarTableRepository extends JpaRepository<BarTable, UUID> {

    List<BarTable> findAllByIsActiveTrueOrderByLabelAsc();

    Optional<BarTable> findByLabel(String label);

    List<BarTable> findAllByStatus(TableStatus status);
}
