package com.championsclub.billing.repo;

import com.championsclub.billing.domain.Payment;
import com.championsclub.billing.domain.PaymentSourceType;
import com.championsclub.billing.domain.PaymentStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    Optional<Payment> findByIdempotencyKey(String idempotencyKey);

    List<Payment> findBySourceTypeAndSourceId(PaymentSourceType sourceType, String sourceId);

    List<Payment> findBySplitGroupId(UUID splitGroupId);

    List<Payment> findByCorporateAccountIdOrderByCreatedAtDesc(UUID corporateAccountId);

    Page<Payment> findByCorporateAccountId(UUID corporateAccountId, Pageable pageable);

    List<Payment> findByStatusAndCreatedAtBefore(PaymentStatus status, Instant cutoff);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Payment p WHERE p.id = :id")
    Optional<Payment> findByIdWithLock(@Param("id") UUID id);

    @Query("SELECT p FROM Payment p ORDER BY p.createdAt DESC")
    Page<Payment> findAllOrdered(Pageable pageable);
}
