package com.championsclub.billing.job;

import com.championsclub.billing.domain.Invoice;
import com.championsclub.billing.domain.InvoiceStatus;
import com.championsclub.billing.repo.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class InvoiceAgingJob {

    private final InvoiceRepository invoiceRepository;

    @Scheduled(cron = "0 0 1 * * ?") // 1 AM daily
    @Transactional
    public void markOverdueInvoices() {
        LocalDate today = LocalDate.now();
        List<Invoice> overdueList = invoiceRepository.findOverdueInvoices(today);

        for (Invoice invoice : overdueList) {
            invoice.setStatus(InvoiceStatus.OVERDUE);
            invoiceRepository.save(invoice);
        }

        if (!overdueList.isEmpty()) {
            log.info("InvoiceAgingJob marked {} invoices as OVERDUE", overdueList.size());
        }
    }
}
