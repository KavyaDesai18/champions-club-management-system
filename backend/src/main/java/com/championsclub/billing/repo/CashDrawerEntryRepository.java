package com.championsclub.billing.repo;

import com.championsclub.billing.domain.CashDrawerEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CashDrawerEntryRepository extends JpaRepository<CashDrawerEntry, UUID> {

    List<CashDrawerEntry> findBySessionIdOrderByCreatedAtAsc(UUID sessionId);
}
