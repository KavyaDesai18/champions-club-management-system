package com.championsclub.member.service;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

/**
 * Core mathematical and date calculations for membership lifecycles.
 * Implements strict club timezone boundaries, proration credits, freeze days,
 * and leap-year / month-end safe calendar math.
 */
@Component
public class MembershipDateCalculator {

    public record RenewalDates(LocalDate startDate, LocalDate endDate) {}
    public record ProrationResult(BigDecimal unusedCredit, BigDecimal netPayable, BigDecimal walletCredit) {}

    /**
     * Renewal date rule:
     * - Renewal before or on expiry date extends from current end_date (no lost days).
     * - Renewal after expiry starts today.
     * End dates are computed end-of-day inclusive in club timezone.
     */
    public RenewalDates calculateRenewalDates(LocalDate currentEndDate, LocalDate asOfDate, int durationMonths) {
        if (currentEndDate == null || asOfDate.isAfter(currentEndDate)) {
            // Renewal after expiry starts today
            LocalDate start = asOfDate;
            LocalDate end = asOfDate.plusMonths(durationMonths);
            return new RenewalDates(start, end);
        } else {
            // Renewal before or on exact expiry day extends from current end_date (no lost days)
            LocalDate start = currentEndDate;
            LocalDate end = currentEndDate.plusMonths(durationMonths);
            return new RenewalDates(start, end);
        }
    }

    /**
     * Determines if a membership has expired given end_date, as_of club date, and grace period days.
     * End date is inclusive in club timezone through 23:59:59.
     */
    public boolean isExpired(LocalDate endDate, LocalDate asOfDate, int gracePeriodDays) {
        if (endDate == null) return false;
        LocalDate effectiveThreshold = endDate.plusDays(gracePeriodDays);
        return asOfDate.isAfter(effectiveThreshold);
    }

    /**
     * Determines if membership is within grace period (passed end date, but within grace period).
     */
    public boolean isInGracePeriod(LocalDate endDate, LocalDate asOfDate, int gracePeriodDays) {
        if (endDate == null || gracePeriodDays <= 0) return false;
        return asOfDate.isAfter(endDate) && !asOfDate.isAfter(endDate.plusDays(gracePeriodDays));
    }

    /**
     * Calculates days left until membership expiry. Returns 0 if already expired.
     */
    public long calculateDaysRemaining(LocalDate endDate, LocalDate asOfDate) {
        if (endDate == null) return 0;
        return Math.max(0, ChronoUnit.DAYS.between(asOfDate, endDate));
    }

    /**
     * Suspension & freeze days rule:
     * When a member is suspended while active and subsequently reactivated,
     * the suspended duration in days extends the membership end date.
     */
    public long calculateFreezeDays(LocalDate suspendedDate, LocalDate reactivatedDate) {
        if (suspendedDate == null || reactivatedDate == null || reactivatedDate.isBefore(suspendedDate)) {
            return 0;
        }
        return ChronoUnit.DAYS.between(suspendedDate, reactivatedDate);
    }

    public LocalDate applyFreezeDays(LocalDate currentEndDate, long freezeDays) {
        if (currentEndDate == null) return null;
        return currentEndDate.plusDays(Math.max(0, freezeDays));
    }

    /**
     * Prorated calculation for mid-term plan upgrades / downgrades:
     * - Unused credit = pricePaid * (remainingDays / totalDays)
     * - Net payable = max(0, newPlanPrice - unusedCredit)
     * - Wallet credit = max(0, unusedCredit - newPlanPrice) (for downgrades or excess value)
     */
    public ProrationResult calculateProration(
            BigDecimal pricePaid,
            LocalDate startDate,
            LocalDate endDate,
            LocalDate asOfDate,
            BigDecimal newPlanPrice
    ) {
        if (pricePaid == null || pricePaid.compareTo(BigDecimal.ZERO) <= 0
                || startDate == null || endDate == null || asOfDate == null || newPlanPrice == null) {
            return new ProrationResult(BigDecimal.ZERO, newPlanPrice != null ? newPlanPrice : BigDecimal.ZERO, BigDecimal.ZERO);
        }

        long totalDays = ChronoUnit.DAYS.between(startDate, endDate);
        if (totalDays <= 0) {
            return new ProrationResult(BigDecimal.ZERO, newPlanPrice, BigDecimal.ZERO);
        }

        long remainingDays = Math.max(0, ChronoUnit.DAYS.between(asOfDate, endDate));
        if (remainingDays <= 0) {
            return new ProrationResult(BigDecimal.ZERO, newPlanPrice, BigDecimal.ZERO);
        }

        BigDecimal unusedCredit = pricePaid
                .multiply(BigDecimal.valueOf(remainingDays))
                .divide(BigDecimal.valueOf(totalDays), 2, RoundingMode.HALF_UP);

        BigDecimal netPayable = newPlanPrice.subtract(unusedCredit).max(BigDecimal.ZERO);
        BigDecimal walletCredit = unusedCredit.subtract(newPlanPrice).max(BigDecimal.ZERO);

        return new ProrationResult(unusedCredit, netPayable, walletCredit);
    }

    /**
     * Checks if UTC instant is still within membership validity in club timezone (Asia/Kolkata).
     */
    public boolean isInstantValidInClubTimezone(Instant instant, LocalDate endDate, ZoneId clubZone) {
        if (instant == null || endDate == null) return false;
        LocalDate clubDate = instant.atZone(clubZone).toLocalDate();
        return !clubDate.isAfter(endDate);
    }
}
