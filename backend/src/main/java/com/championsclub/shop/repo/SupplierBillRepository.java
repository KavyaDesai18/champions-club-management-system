package com.championsclub.shop.repo;

import com.championsclub.shop.domain.SupplierBill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SupplierBillRepository extends JpaRepository<SupplierBill, UUID> {
    Optional<SupplierBill> findByBillNumber(String billNumber);
    List<SupplierBill> findBySupplierIdOrderByCreatedAtDesc(UUID supplierId);
    List<SupplierBill> findByStatusOrderByCreatedAtDesc(String status);

    @Query("SELECT COALESCE(SUM(b.amount), 0) FROM SupplierBill b WHERE b.status = 'UNPAID'")
    BigDecimal calculateTotalUnpaidBills();
}
