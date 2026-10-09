package com.championsclub.reporting.service;

import com.championsclub.reporting.domain.DateRangePreset;
import com.championsclub.reporting.dto.FinancialSummaryDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduledReportSummaryService {

    private final ReportingService reportingService;

    /**
     * Stub scheduled email summary dispatch.
     * Fires weekly on Monday at 08:00 AM (or can be triggered on demand).
     */
    @Scheduled(cron = "0 0 8 * * MON", zone = "Asia/Kolkata")
    public void sendWeeklyExecutiveSummaryEmail() {
        log.info("Generating scheduled weekly executive financial summary for club owners...");
        try {
            FinancialSummaryDto summary = reportingService.getFinancialSummary(DateRangePreset.THIS_WEEK, null, null);
            log.info("Weekly Summary Prepared: Total Revenue = INR {}, Receivables = INR {}, Payables = INR {}, Net Position = INR {}",
                    summary.getTotalRevenue(),
                    summary.getTotalReceivables(),
                    summary.getTotalPayables(),
                    summary.getNetPosition());
            // Email stub delivery
            log.info("Executive email stub sent to owner@championsclub.com and management@championsclub.com");
        } catch (Exception ex) {
            log.warn("Failed to generate scheduled weekly financial report summary", ex);
        }
    }

    /**
     * Stub monthly financial closing summary dispatch.
     * Fires on 1st of every month at 09:00 AM.
     */
    @Scheduled(cron = "0 0 9 1 * *", zone = "Asia/Kolkata")
    public void sendMonthlyExecutiveSummaryEmail() {
        log.info("Generating scheduled monthly closing financial summary for club owners...");
        try {
            FinancialSummaryDto summary = reportingService.getFinancialSummary(DateRangePreset.LAST_MONTH, null, null);
            log.info("Monthly Closing Summary Prepared: Total Revenue = INR {}, Net Position = INR {}",
                    summary.getTotalRevenue(), summary.getNetPosition());
            log.info("Executive monthly email stub sent to owner@championsclub.com");
        } catch (Exception ex) {
            log.warn("Failed to generate scheduled monthly financial report summary", ex);
        }
    }
}
