package com.championsclub.billing.repo;

import com.championsclub.billing.domain.Invoice;
import com.championsclub.billing.domain.InvoiceStatus;
import com.championsclub.billing.domain.PaymentSourceType;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);

    List<Invoice> findByPaymentId(UUID paymentId);

    List<Invoice> findBySourceTypeAndSourceId(PaymentSourceType sourceType, String sourceId);

    List<Invoice> findByCorporateAccountIdOrderByIssueDateDesc(UUID corporateAccountId);

    List<Invoice> findByCorporateAccountIdAndStatusIn(UUID corporateAccountId, List<InvoiceStatus> statuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Invoice i WHERE i.id = :id")
    Optional<Invoice> findByIdWithLock(@Param("id") UUID id);

    @Query("SELECT i FROM Invoice i WHERE " +
           "(:status IS NULL OR i.status = :status) AND " +
           "(:isCorporate IS NULL OR (:isCorporate = true AND i.corporateAccount IS NOT NULL) OR (:isCorporate = false AND i.corporateAccount IS NULL)) AND " +
           "(:startDate IS NULL OR i.issueDate >= :startDate) AND " +
           "(:endDate IS NULL OR i.issueDate <= :endDate) AND " +
           "(:search IS NULL OR LOWER(i.invoiceNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(i.recipientName) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Invoice> findInvoicesFiltered(
            @Param("status") InvoiceStatus status,
            @Param("isCorporate") Boolean isCorporate,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("search") String search,
            Pageable pageable
    );

    @Query("SELECT i FROM Invoice i WHERE i.status IN ('SENT', 'DRAFT') AND i.dueDate IS NOT NULL AND i.dueDate < :today")
    List<Invoice> findOverdueInvoices(@Param("today") LocalDate today);
}
