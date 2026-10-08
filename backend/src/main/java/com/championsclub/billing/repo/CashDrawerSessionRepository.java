package com.championsclub.billing.repo;

import com.championsclub.billing.domain.CashDrawerSession;
import com.championsclub.billing.domain.CashDrawerStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CashDrawerSessionRepository extends JpaRepository<CashDrawerSession, UUID> {

    Optional<CashDrawerSession> findByStaffUserIdAndStatus(UUID staffUserId, CashDrawerStatus status);

    List<CashDrawerSession> findByStatusOrderByOpenedAtDesc(CashDrawerStatus status);

    @Query("SELECT s FROM CashDrawerSession s ORDER BY s.openedAt DESC")
    List<CashDrawerSession> findAllRecentSessions();

    @Query("SELECT s FROM CashDrawerSession s WHERE s.status = 'OPEN' ORDER BY s.openedAt DESC")
    List<CashDrawerSession> findAllOpenSessions();
}
