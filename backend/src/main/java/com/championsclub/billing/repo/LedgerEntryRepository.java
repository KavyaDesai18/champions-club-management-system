package com.championsclub.billing.repo;

import com.championsclub.billing.domain.LedgerAccount;
import com.championsclub.billing.domain.LedgerEntry;
import com.championsclub.billing.domain.LedgerEntryType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Repository
public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, UUID> {

    List<LedgerEntry> findByTransactionId(UUID transactionId);

    List<LedgerEntry> findByPaymentId(UUID paymentId);

    Page<LedgerEntry> findByAccountOrderByCreatedAtDesc(LedgerAccount account, Pageable pageable);

    @Query("SELECT COALESCE(SUM(l.amount), 0) FROM LedgerEntry l WHERE l.transactionId = :txId AND l.entryType = :entryType")
    BigDecimal sumAmountByTransactionIdAndType(@Param("txId") UUID transactionId, @Param("entryType") LedgerEntryType entryType);

    @Query("SELECT COALESCE(SUM(CASE WHEN l.entryType = 'CREDIT' THEN l.amount ELSE -l.amount END), 0) FROM LedgerEntry l WHERE l.account = :account")
    BigDecimal calculateAccountNetBalance(@Param("account") LedgerAccount account);

    @Query("SELECT l.transactionId FROM LedgerEntry l GROUP BY l.transactionId HAVING SUM(CASE WHEN l.entryType = 'DEBIT' THEN l.amount ELSE -l.amount END) != 0")
    List<UUID> findUnbalancedTransactions();
}
