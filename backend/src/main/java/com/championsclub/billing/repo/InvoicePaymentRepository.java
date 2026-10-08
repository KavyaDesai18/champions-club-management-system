package com.championsclub.billing.repo;

import com.championsclub.billing.domain.InvoicePayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Repository
public interface InvoicePaymentRepository extends JpaRepository<InvoicePayment, UUID> {

    List<InvoicePayment> findByInvoiceId(UUID invoiceId);

    List<InvoicePayment> findByPaymentId(UUID paymentId);

    @Query("SELECT COALESCE(SUM(ip.amountAllocated), 0) FROM InvoicePayment ip WHERE ip.invoice.id = :invoiceId")
    BigDecimal getTotalAllocatedForInvoice(@Param("invoiceId") UUID invoiceId);

    @Query("SELECT COALESCE(SUM(ip.amountAllocated), 0) FROM InvoicePayment ip WHERE ip.payment.id = :paymentId")
    BigDecimal getTotalAllocatedForPayment(@Param("paymentId") UUID paymentId);
}
