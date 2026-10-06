package com.championsclub.common.money;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.math.RoundingMode;

import static org.assertj.core.api.Assertions.assertThat;

class MoneyTest {

    @Test
    @DisplayName("Money should maintain 2 decimal places and HALF_UP rounding")
    void testPrecisionAndRounding() {
        Money m1 = Money.of(new BigDecimal("10.555"));
        assertThat(m1.getAmount()).isEqualByComparingTo(new BigDecimal("10.56"));

        Money m2 = Money.of(new BigDecimal("10.554"));
        assertThat(m2.getAmount()).isEqualByComparingTo(new BigDecimal("10.55"));
    }

    @Test
    @DisplayName("Money should correctly calculate additions and minor units")
    void testAdditionAndMinorUnits() {
        Money a = Money.of(100.25);
        Money b = Money.of(49.75);
        Money total = a.add(b);

        assertThat(total.getAmount()).isEqualByComparingTo(new BigDecimal("150.00"));
        assertThat(total.getMinorUnits()).isEqualTo(15000L);
    }

    @Test
    @DisplayName("Money should correctly apply discount percentages")
    void testDiscounts() {
        Money baseRate = Money.of(200.00);
        // 25% discount for Gold members
        Money discounted = baseRate.applyDiscountPercentage(new BigDecimal("25.00"));

        assertThat(discounted.getAmount()).isEqualByComparingTo(new BigDecimal("150.00"));
    }
}
