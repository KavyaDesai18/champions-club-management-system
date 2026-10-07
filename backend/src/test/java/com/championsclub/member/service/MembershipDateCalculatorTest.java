package com.championsclub.member.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Membership Date Math & Calculator Table-Driven Test Suite (20+ Scenarios)")
class MembershipDateCalculatorTest {

    private final MembershipDateCalculator calculator = new MembershipDateCalculator();
    private final ZoneId clubZone = ZoneId.of("Asia/Kolkata");

    // -------------------------------------------------------------
    // 1-10: Calendar math, leap years, month-end transitions
    // -------------------------------------------------------------
    @ParameterizedTest(name = "[{index}] Adding {1} months to {0} -> expected {2}")
    @CsvSource({
            // Leap year Feb 29
            "2024-02-29, 12, 2025-02-28", // Scenario 1: Leap day + 1 year resolves to Feb 28
            "2024-02-29, 1,  2024-03-29", // Scenario 2: Leap day + 1 month
            "2024-01-31, 1,  2024-02-29", // Scenario 3: Jan 31 + 1 month in leap year -> Feb 29
            "2023-01-31, 1,  2023-02-28", // Scenario 4: Jan 31 + 1 month in normal year -> Feb 28
            "2025-02-28, 12, 2026-02-28", // Scenario 5: Feb 28 in normal year + 12 months
            "2024-03-31, 1,  2024-04-30", // Scenario 6: March 31 + 1 month -> April 30
            "2024-05-31, 1,  2024-06-30", // Scenario 7: May 31 + 1 month -> June 30
            "2024-08-31, 1,  2024-09-30", // Scenario 8: August 31 + 1 month -> Sept 30
            "2024-10-31, 1,  2024-11-30", // Scenario 9: October 31 + 1 month -> Nov 30
            "2024-12-31, 1,  2025-01-31"  // Scenario 10: Dec 31 + 1 month -> Jan 31
    })
    void testCalendarMathAndLeapYearScenarios(String startDateStr, int months, String expectedEndDateStr) {
        LocalDate startDate = LocalDate.parse(startDateStr);
        LocalDate expectedEndDate = LocalDate.parse(expectedEndDateStr);

        LocalDate calculated = startDate.plusMonths(months);
        assertThat(calculated).isEqualTo(expectedEndDate);
    }

    // -------------------------------------------------------------
    // 11-15: Renewal rule scenarios (before, exact day, after expiry)
    // -------------------------------------------------------------
    @Test
    @DisplayName("Scenario 11: Renewal 15 days before expiry extends from current end_date (no lost days)")
    void testRenewalBeforeExpiryExtendsFromCurrentEndDate() {
        LocalDate currentEndDate = LocalDate.of(2026, 6, 30);
        LocalDate asOfDate = LocalDate.of(2026, 6, 15); // 15 days before

        MembershipDateCalculator.RenewalDates result = calculator.calculateRenewalDates(currentEndDate, asOfDate, 12);

        assertThat(result.startDate()).isEqualTo(currentEndDate);
        assertThat(result.endDate()).isEqualTo(LocalDate.of(2027, 6, 30));
    }

    @Test
    @DisplayName("Scenario 12: Renewal on the EXACT expiry day extends from current end_date (no lost days)")
    void testRenewalOnExactExpiryDayExtendsFromCurrentEndDate() {
        LocalDate currentEndDate = LocalDate.of(2026, 6, 30);
        LocalDate asOfDate = LocalDate.of(2026, 6, 30); // Exact expiry day

        MembershipDateCalculator.RenewalDates result = calculator.calculateRenewalDates(currentEndDate, asOfDate, 12);

        assertThat(result.startDate()).isEqualTo(currentEndDate);
        assertThat(result.endDate()).isEqualTo(LocalDate.of(2027, 6, 30));
    }

    @Test
    @DisplayName("Scenario 13: Renewal ONE DAY after expiry starts today")
    void testRenewalOneDayAfterExpiryStartsToday() {
        LocalDate currentEndDate = LocalDate.of(2026, 6, 30);
        LocalDate asOfDate = LocalDate.of(2026, 7, 1); // 1 day after expiry

        MembershipDateCalculator.RenewalDates result = calculator.calculateRenewalDates(currentEndDate, asOfDate, 12);

        assertThat(result.startDate()).isEqualTo(asOfDate);
        assertThat(result.endDate()).isEqualTo(LocalDate.of(2027, 7, 1));
    }

    @Test
    @DisplayName("Scenario 14: Renewal months after expiry starts today")
    void testRenewalMonthsAfterExpiryStartsToday() {
        LocalDate currentEndDate = LocalDate.of(2025, 12, 31);
        LocalDate asOfDate = LocalDate.of(2026, 5, 10);

        MembershipDateCalculator.RenewalDates result = calculator.calculateRenewalDates(currentEndDate, asOfDate, 6);

        assertThat(result.startDate()).isEqualTo(asOfDate);
        assertThat(result.endDate()).isEqualTo(LocalDate.of(2026, 11, 10));
    }

    @Test
    @DisplayName("Scenario 15: New membership (no prior end date) starts today")
    void testRenewalWhenPriorEndDateNullStartsToday() {
        LocalDate asOfDate = LocalDate.of(2026, 1, 15);
        MembershipDateCalculator.RenewalDates result = calculator.calculateRenewalDates(null, asOfDate, 12);

        assertThat(result.startDate()).isEqualTo(asOfDate);
        assertThat(result.endDate()).isEqualTo(LocalDate.of(2027, 1, 15));
    }

    // -------------------------------------------------------------
    // 16-19: Grace period & expiry boundary calculations
    // -------------------------------------------------------------
    @ParameterizedTest(name = "[{index}] End date: {0}, AsOf: {1}, Grace: {2} -> Expired: {3}")
    @CsvSource({
            "2026-05-10, 2026-05-10, 0, false", // Scenario 16: Exact end date with grace=0 is NOT expired (inclusive end of day)
            "2026-05-10, 2026-05-11, 0, true",  // Scenario 17: Day after end date with grace=0 is expired
            "2026-05-10, 2026-05-12, 3, false", // Scenario 18: 2 days after end date with grace=3 is NOT expired
            "2026-05-10, 2026-05-13, 3, false", // Scenario 19: 3 days after end date with grace=3 is NOT expired (within grace)
            "2026-05-10, 2026-05-14, 3, true"   // Scenario 20: 4 days after end date with grace=3 is expired
    })
    void testGracePeriodAndExpiryBoundaries(String endDateStr, String asOfStr, int gracePeriod, boolean expectedExpired) {
        LocalDate endDate = LocalDate.parse(endDateStr);
        LocalDate asOf = LocalDate.parse(asOfStr);

        boolean expired = calculator.isExpired(endDate, asOf, gracePeriod);
        assertThat(expired).isEqualTo(expectedExpired);
    }

    // -------------------------------------------------------------
    // 21-22: Timezone boundary at 23:59:59 vs 00:00:00 (Asia/Kolkata +05:30)
    // -------------------------------------------------------------
    @Test
    @DisplayName("Scenario 21: Timezone boundary at 23:59:59 IST (18:29:59 UTC) is still ACTIVE on expiry date")
    void testTimezoneBoundaryAt235959ISTIsActive() {
        LocalDate endDate = LocalDate.of(2026, 10, 7);
        // 2026-10-07 23:59:59 IST = 2026-10-07 18:29:59 UTC
        Instant instantBeforeMidnight = Instant.parse("2026-10-07T18:29:59Z");

        boolean valid = calculator.isInstantValidInClubTimezone(instantBeforeMidnight, endDate, clubZone);
        assertThat(valid).isTrue();
    }

    @Test
    @DisplayName("Scenario 22: Timezone boundary at 00:00:00 IST (18:30:00 UTC) is EXPIRED after expiry date")
    void testTimezoneBoundaryAt000000ISTIsExpired() {
        LocalDate endDate = LocalDate.of(2026, 10, 7);
        // 2026-10-08 00:00:00 IST = 2026-10-07 18:30:00 UTC
        Instant instantAtMidnight = Instant.parse("2026-10-07T18:30:00Z");

        boolean valid = calculator.isInstantValidInClubTimezone(instantAtMidnight, endDate, clubZone);
        assertThat(valid).isFalse();
    }

    // -------------------------------------------------------------
    // 23-25: Suspension & freeze days calculations
    // -------------------------------------------------------------
    @Test
    @DisplayName("Scenario 23: Member suspended for 14 days gets exactly 14 freeze days extending end date")
    void testFreezeDaysExtension() {
        LocalDate suspendedDate = LocalDate.of(2026, 3, 1);
        LocalDate reactivatedDate = LocalDate.of(2026, 3, 15);
        LocalDate originalEndDate = LocalDate.of(2026, 12, 31);

        long freezeDays = calculator.calculateFreezeDays(suspendedDate, reactivatedDate);
        LocalDate extendedEndDate = calculator.applyFreezeDays(originalEndDate, freezeDays);

        assertThat(freezeDays).isEqualTo(14);
        assertThat(extendedEndDate).isEqualTo(LocalDate.of(2027, 1, 14));
    }

    @Test
    @DisplayName("Scenario 24: Member suspended and reactivated on same day gets 0 freeze days")
    void testSameDayReactivationZeroFreezeDays() {
        LocalDate date = LocalDate.of(2026, 4, 10);
        long freezeDays = calculator.calculateFreezeDays(date, date);
        assertThat(freezeDays).isZero();
    }

    // -------------------------------------------------------------
    // 26-28: Mid-term plan upgrade / downgrade proration rules
    // -------------------------------------------------------------
    @Test
    @DisplayName("Scenario 25: Mid-term plan UPGRADE - prorated unused credit reduces new plan price")
    void testMidTermUpgradeProration() {
        LocalDate startDate = LocalDate.of(2026, 1, 1);
        LocalDate endDate = LocalDate.of(2026, 12, 31); // 364 days total
        LocalDate asOfDate = LocalDate.of(2026, 7, 2);   // 182 days remaining (approx 50%)
        BigDecimal pricePaid = BigDecimal.valueOf(2000.00);
        BigDecimal newPlanPrice = BigDecimal.valueOf(3500.00);

        MembershipDateCalculator.ProrationResult proration = calculator.calculateProration(
                pricePaid, startDate, endDate, asOfDate, newPlanPrice
        );

        assertThat(proration.unusedCredit()).isGreaterThan(BigDecimal.valueOf(990.00))
                .isLessThan(BigDecimal.valueOf(1010.00));
        assertThat(proration.netPayable()).isEqualByComparingTo(newPlanPrice.subtract(proration.unusedCredit()));
        assertThat(proration.walletCredit()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("Scenario 26: Mid-term plan DOWNGRADE - excess credit refunded to member wallet")
    void testMidTermDowngradeWalletCredit() {
        LocalDate startDate = LocalDate.of(2026, 1, 1);
        LocalDate endDate = LocalDate.of(2026, 12, 31);
        LocalDate asOfDate = LocalDate.of(2026, 2, 1); // 333 days remaining out of 364
        BigDecimal pricePaid = BigDecimal.valueOf(3000.00); // Silver/Gold VIP
        BigDecimal newPlanPrice = BigDecimal.valueOf(500.00); // Cheaper monthly or Cadet plan

        MembershipDateCalculator.ProrationResult proration = calculator.calculateProration(
                pricePaid, startDate, endDate, asOfDate, newPlanPrice
        );

        assertThat(proration.unusedCredit()).isGreaterThan(newPlanPrice);
        assertThat(proration.netPayable()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(proration.walletCredit()).isEqualByComparingTo(proration.unusedCredit().subtract(newPlanPrice));
    }
}
