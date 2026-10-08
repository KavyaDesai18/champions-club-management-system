package com.championsclub.shop.repo;

import com.championsclub.shop.domain.Inventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface InventoryRepository extends JpaRepository<Inventory, UUID> {

    Optional<Inventory> findByVariantId(UUID variantId);

    /**
     * Atomic sale deduction: Decrements on_hand directly if and only if (on_hand - reserved) >= qty.
     * Guarantees overselling is impossible.
     */
    @Modifying
    @Query("UPDATE Inventory i SET i.onHand = i.onHand - :qty, i.updatedAt = CURRENT_TIMESTAMP " +
           "WHERE i.variantId = :variantId AND (i.onHand - i.reserved) >= :qty")
    int atomicDeductOnHand(@Param("variantId") UUID variantId, @Param("qty") int qty);

    /**
     * Atomic reserve: Increases reserved if and only if (on_hand - reserved) >= qty.
     */
    @Modifying
    @Query("UPDATE Inventory i SET i.reserved = i.reserved + :qty, i.updatedAt = CURRENT_TIMESTAMP " +
           "WHERE i.variantId = :variantId AND (i.onHand - i.reserved) >= :qty")
    int atomicReserve(@Param("variantId") UUID variantId, @Param("qty") int qty);

    /**
     * Atomic release: Decreases reserved if and only if reserved >= qty.
     */
    @Modifying
    @Query("UPDATE Inventory i SET i.reserved = i.reserved - :qty, i.updatedAt = CURRENT_TIMESTAMP " +
           "WHERE i.variantId = :variantId AND i.reserved >= :qty")
    int atomicRelease(@Param("variantId") UUID variantId, @Param("qty") int qty);

    /**
     * Atomic fulfillment of reserved items: Decrements on_hand and reserved together.
     */
    @Modifying
    @Query("UPDATE Inventory i SET i.onHand = i.onHand - :qty, i.reserved = i.reserved - :qty, i.updatedAt = CURRENT_TIMESTAMP " +
           "WHERE i.variantId = :variantId AND i.reserved >= :qty AND i.onHand >= :qty")
    int atomicFulfillReservedSale(@Param("variantId") UUID variantId, @Param("qty") int qty);

    /**
     * Atomic restock / purchase / return addition: Increments on_hand.
     */
    @Modifying
    @Query("UPDATE Inventory i SET i.onHand = i.onHand + :qty, i.updatedAt = CURRENT_TIMESTAMP " +
           "WHERE i.variantId = :variantId")
    int atomicAddOnHand(@Param("variantId") UUID variantId, @Param("qty") int qty);

    /**
     * Atomic cycle count adjustment / reconcile: Updates on_hand to newOnHand if newOnHand >= reserved.
     */
    @Modifying
    @Query("UPDATE Inventory i SET i.onHand = :newOnHand, i.updatedAt = CURRENT_TIMESTAMP " +
           "WHERE i.variantId = :variantId AND :newOnHand >= i.reserved")
    int atomicReconcileOnHand(@Param("variantId") UUID variantId, @Param("newOnHand") int newOnHand);
}
