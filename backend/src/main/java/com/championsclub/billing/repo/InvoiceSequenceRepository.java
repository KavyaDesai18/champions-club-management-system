package com.championsclub.billing.repo;

import com.championsclub.billing.domain.InvoiceSequence;
import com.championsclub.billing.domain.InvoiceSequenceId;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface InvoiceSequenceRepository extends JpaRepository<InvoiceSequence, InvoiceSequenceId> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM InvoiceSequence s WHERE s.financialYear = :fy AND s.sequenceType = :seqType")
    Optional<InvoiceSequence> findByFinancialYearAndSequenceTypeWithLock(@Param("fy") String financialYear, @Param("seqType") String sequenceType);
}
