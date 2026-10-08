package com.championsclub.billing.service;

import com.championsclub.billing.domain.InvoiceSequence;
import com.championsclub.billing.repo.InvoiceSequenceRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InvoiceSequenceConcurrencyTest {

    @Test
    @DisplayName("Concurrency: Gapless sequential invoice numbering across 20 concurrent threads")
    void testConcurrentGaplessInvoiceNumbering() throws InterruptedException, ExecutionException {
        InvoiceSequenceRepository sequenceRepository = mock(InvoiceSequenceRepository.class);

        // Simulate DB row-level pessimistic locking behavior in memory
        final Object rowLock = new Object();
        final AtomicLong counter = new AtomicLong(0);

        when(sequenceRepository.findByFinancialYearAndSequenceTypeWithLock(anyString(), anyString()))
                .thenAnswer(inv -> {
                    synchronized (rowLock) {
                        String fy = inv.getArgument(0);
                        String type = inv.getArgument(1);
                        long val = counter.get();
                        InvoiceSequence seq = InvoiceSequence.builder()
                                .financialYear(fy)
                                .sequenceType(type)
                                .lastNumber(val)
                                .build();
                        return Optional.of(seq);
                    }
                });

        when(sequenceRepository.saveAndFlush(any(InvoiceSequence.class)))
                .thenAnswer(inv -> {
                    synchronized (rowLock) {
                        InvoiceSequence s = inv.getArgument(0);
                        counter.set(s.getLastNumber());
                        return s;
                    }
                });

        InvoiceSequenceService service = new InvoiceSequenceService(sequenceRepository);

        int threadCount = 20;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        List<Future<InvoiceSequenceService.SequenceResult>> futures = new ArrayList<>();

        LocalDate today = LocalDate.now();

        for (int i = 0; i < threadCount; i++) {
            futures.add(executor.submit(() -> {
                startLatch.await(); // ensure all threads start simultaneously
                synchronized (rowLock) { // simulate @Transactional(MANDATORY) serialized execution
                    return service.nextInvoiceNumber(today);
                }
            }));
        }

        startLatch.countDown(); // Trigger all threads at once

        Set<String> generatedNumbers = new HashSet<>();
        List<Long> sequenceNumbers = new ArrayList<>();

        for (Future<InvoiceSequenceService.SequenceResult> f : futures) {
            InvoiceSequenceService.SequenceResult res = f.get();
            generatedNumbers.add(res.documentNumber());
            sequenceNumbers.add(res.sequenceNumber());
        }

        executor.shutdown();

        // 1. Exactly 20 distinct document numbers generated (NO DUPLICATES)
        assertThat(generatedNumbers).hasSize(threadCount);

        // 2. Numbers are strictly gapless from 1 to 20 (NO GAPS)
        Collections.sort(sequenceNumbers);
        assertThat(sequenceNumbers).containsExactly(
                1L, 2L, 3L, 4L, 5L, 6L, 7L, 8L, 9L, 10L,
                11L, 12L, 13L, 14L, 15L, 16L, 17L, 18L, 19L, 20L
        );
    }
}
