package com.championsclub.shop.repo;

import com.championsclub.shop.domain.StockMovement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, UUID> {

    List<StockMovement> findByVariantIdOrderByCreatedAtDesc(UUID variantId);

    Page<StockMovement> findByVariantIdOrderByCreatedAtDesc(UUID variantId, Pageable pageable);

    @Query("SELECT sm FROM StockMovement sm ORDER BY sm.createdAt DESC")
    Page<StockMovement> findAllRecent(Pageable pageable);

    /**
     * Compute sum of all movement quantities for a variant.
     * Ledger invariant asserts: sumQtyByVariantId(variantId) == inventory.onHand.
     */
    @Query("SELECT COALESCE(SUM(sm.qty), 0) FROM StockMovement sm WHERE sm.variant.id = :variantId")
    int sumQtyByVariantId(@Param("variantId") UUID variantId);
}
