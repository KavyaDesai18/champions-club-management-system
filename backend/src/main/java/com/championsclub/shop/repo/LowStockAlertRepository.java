package com.championsclub.shop.repo;

import com.championsclub.shop.domain.LowStockAlert;
import com.championsclub.shop.domain.LowStockAlertStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LowStockAlertRepository extends JpaRepository<LowStockAlert, UUID> {

    Optional<LowStockAlert> findByVariantIdAndStatus(UUID variantId, LowStockAlertStatus status);

    @Query("SELECT a FROM LowStockAlert a WHERE a.status = 'ACTIVE' ORDER BY a.createdAt DESC")
    List<LowStockAlert> findAllActive();

    long countByStatus(LowStockAlertStatus status);
}
