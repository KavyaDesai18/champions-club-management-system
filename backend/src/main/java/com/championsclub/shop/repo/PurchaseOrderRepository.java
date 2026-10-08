package com.championsclub.shop.repo;

import com.championsclub.shop.domain.PurchaseOrder;
import com.championsclub.shop.domain.PurchaseOrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, UUID> {
    Optional<PurchaseOrder> findByPoNumber(String poNumber);
    List<PurchaseOrder> findBySupplierIdOrderByCreatedAtDesc(UUID supplierId);
    List<PurchaseOrder> findByStatusOrderByCreatedAtDesc(PurchaseOrderStatus status);

    @Query("SELECT po FROM PurchaseOrder po ORDER BY po.createdAt DESC")
    List<PurchaseOrder> findAllRecent();
}
