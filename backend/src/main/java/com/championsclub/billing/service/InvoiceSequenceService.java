package com.championsclub.billing.service;

import com.championsclub.billing.domain.InvoiceSequence;
import com.championsclub.billing.repo.InvoiceSequenceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class InvoiceSequenceService {

    private final InvoiceSequenceRepository sequenceRepository;

    public record SequenceResult(String documentNumber, String financialYear, Long sequenceNumber) {}

    /**
     * Atomically allocates the next gapless sequential document number for the current financial year.
     * Uses pessimistic row-level lock (SELECT FOR UPDATE) to guarantee race-free concurrency.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public SequenceResult nextInvoiceNumber(LocalDate date) {
        return allocateNext("INVOICE", "INV", date);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public SequenceResult nextCreditNoteNumber(LocalDate date) {
        return allocateNext("CREDIT_NOTE", "CN", date);
    }

    private SequenceResult allocateNext(String sequenceType, String prefix, LocalDate date) {
        String fy = computeFinancialYear(date != null ? date : LocalDate.now());

        Optional<InvoiceSequence> existingOpt = sequenceRepository.findByFinancialYearAndSequenceTypeWithLock(fy, sequenceType);

        InvoiceSequence sequence;
        if (existingOpt.isPresent()) {
            sequence = existingOpt.get();
            sequence.setLastNumber(sequence.getLastNumber() + 1);
            sequence.setUpdatedAt(Instant.now());
        } else {
            sequence = InvoiceSequence.builder()
                    .financialYear(fy)
                    .sequenceType(sequenceType)
                    .lastNumber(1L)
                    .updatedAt(Instant.now())
                    .build();
        }

        InvoiceSequence saved = sequenceRepository.saveAndFlush(sequence);
        long num = saved.getLastNumber();
        String docNumber = String.format("%s-%s-%05d", prefix, fy, num);

        log.debug("Allocated {} number: {} (Seq: {})", sequenceType, docNumber, num);
        return new SequenceResult(docNumber, fy, num);
    }

    public String computeFinancialYear(LocalDate date) {
        // Indian Financial Year: April 1 to March 31
        int year = date.getYear();
        if (date.getMonthValue() >= 4) {
            return year + "-" + String.valueOf(year + 1).substring(2);
        } else {
            return (year - 1) + "-" + String.valueOf(year).substring(2);
        }
    }
}
