package com.championsclub.court.job;

import com.championsclub.court.service.CourtBookingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class BookingMaintenanceJobs {

    private static final Logger log = LoggerFactory.getLogger(BookingMaintenanceJobs.class);

    private final CourtBookingService bookingService;

    public BookingMaintenanceJobs(CourtBookingService bookingService) {
        this.bookingService = bookingService;
    }

    @Scheduled(fixedDelay = 30000, initialDelay = 10000)
    public void releaseExpiredHolds() {
        try {
            int released = bookingService.releaseExpiredHolds();
            if (released > 0) {
                log.info("[Job: RELEASE_EXPIRED_HOLDS] Released {} expired slot holds and notified waitlists", released);
            }
        } catch (Exception e) {
            log.error("[Job: RELEASE_EXPIRED_HOLDS] Error releasing expired holds: {}", e.getMessage(), e);
        }
    }

    @Scheduled(cron = "0 */15 * * * *")
    public void autoCompleteBookings() {
        try {
            int completed = bookingService.autoCompleteBookings();
            if (completed > 0) {
                log.info("[Job: AUTO_COMPLETE_BOOKINGS] Completed {} concluded court bookings", completed);
            }
        } catch (Exception e) {
            log.error("[Job: AUTO_COMPLETE_BOOKINGS] Error auto-completing bookings: {}", e.getMessage(), e);
        }
    }
}
