package com.championsclub.billing.repo;

import com.championsclub.billing.domain.CreditNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CreditNoteRepository extends JpaRepository<CreditNote, UUID> {

    Optional<CreditNote> findByCreditNoteNumber(String creditNoteNumber);

    List<CreditNote> findByInvoiceId(UUID invoiceId);

    List<CreditNote> findByRefundId(UUID refundId);
}
