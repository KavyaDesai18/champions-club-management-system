package com.championsclub.bar.repo;

import com.championsclub.bar.domain.Tab;
import com.championsclub.bar.domain.TabStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TabRepository extends JpaRepository<Tab, UUID> {

    Optional<Tab> findByTabNumber(String tabNumber);

    List<Tab> findAllByStatusOrderByCreatedAtDesc(TabStatus status);

    Optional<Tab> findFirstByTableIdAndStatus(UUID tableId, TabStatus status);

    List<Tab> findAllByMemberIdAndStatus(UUID memberId, TabStatus status);

    List<Tab> findAllByShiftId(UUID shiftId);

    List<Tab> findAllByIsCarriedForwardTrueAndStatus(TabStatus status);

    List<Tab> findAllByCreatedAtBetweenOrderByCreatedAtDesc(Instant start, Instant end);

    @Query("SELECT t FROM Tab t WHERE t.status = :status AND t.shift.id = :shiftId")
    List<Tab> findOpenTabsInShift(@Param("shiftId") UUID shiftId, @Param("status") TabStatus status);

    @Query("SELECT count(t) FROM Tab t WHERE t.member.id = :memberId AND t.status = 'OPEN'")
    long countOpenTabsByMemberId(@Param("memberId") UUID memberId);
}
