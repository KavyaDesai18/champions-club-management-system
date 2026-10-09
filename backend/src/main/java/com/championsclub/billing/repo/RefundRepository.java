package com.championsclub.billing.repo;

import com.championsclub.billing.domain.Refund;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RefundRepository extends JpaRepository<Refund, UUID> {

    Optional<Refund> findByRefundRef(String refundRef);

    List<Refund> findByPaymentIdOrderByCreatedAtDesc(UUID paymentId);

    @Query("SELECT COALESCE(SUM(r.amount), 0) FROM Refund r WHERE r.payment.id = :paymentId AND r.status = 'SUCCEEDED'")
    BigDecimal getTotalRefundedForPayment(@Param("paymentId") UUID paymentId);

    @Query("SELECT r FROM Refund r WHERE r.status = 'SUCCEEDED' AND r.createdAt >= :start AND r.createdAt <= :end")
    List<Refund> findSuccessfulRefundsBetween(@Param("start") java.time.Instant start, @Param("end") java.time.Instant end);

    @Query("SELECT COALESCE(SUM(r.amount), 0) FROM Refund r WHERE r.status = 'SUCCEEDED' AND r.createdAt >= :start AND r.createdAt <= :end")
    BigDecimal sumSuccessfulRefundsBetween(@Param("start") java.time.Instant start, @Param("end") java.time.Instant end);
}
