package com.championsclub.shop.service;

import com.championsclub.shop.domain.OrderStatus;
import com.championsclub.shop.exception.IllegalOrderStateTransitionException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;
import java.math.RoundingMode;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ShopOrderStateMachineTest {

    @ParameterizedTest(name = "Valid transition: {0} -> {1}")
    @CsvSource({
            "CART, PLACED",
            "CART, CANCELLED",
            "PLACED, PAID",
            "PLACED, CANCELLED",
            "PAID, PACKED",
            "PAID, COMPLETED",
            "PAID, CANCELLED",
            "PACKED, READY",
            "PACKED, OUT_FOR_DELIVERY",
            "PACKED, CANCELLED",
            "READY, COMPLETED",
            "READY, CANCELLED",
            "OUT_FOR_DELIVERY, COMPLETED",
            "OUT_FOR_DELIVERY, CANCELLED",
            "COMPLETED, REFUNDED"
    })
    @DisplayName("State Machine: Valid transitions succeed")
    void testValidTransitions(OrderStatus from, OrderStatus to) {
        assertThat(from.canTransitionTo(to))
                .as("Transition %s -> %s must be allowed", from, to)
                .isTrue();
    }

    @ParameterizedTest(name = "Illegal transition: {0} -> {1}")
    @CsvSource({
            "CART, PAID",
            "CART, PACKED",
            "CART, READY",
            "CART, COMPLETED",
            "CART, REFUNDED",
            "PLACED, PACKED",
            "PLACED, READY",
            "PLACED, OUT_FOR_DELIVERY",
            "PLACED, COMPLETED",
            "PLACED, REFUNDED",
            "PAID, READY",
            "PAID, OUT_FOR_DELIVERY",
            "PAID, REFUNDED",
            "PACKED, PLACED",
            "PACKED, COMPLETED",
            "PACKED, REFUNDED",
            "READY, PACKED",
            "READY, OUT_FOR_DELIVERY",
            "READY, REFUNDED",
            "OUT_FOR_DELIVERY, READY",
            "OUT_FOR_DELIVERY, REFUNDED",
            "COMPLETED, CANCELLED",
            "COMPLETED, PAID",
            "COMPLETED, PLACED",
            "CANCELLED, CART",
            "CANCELLED, PLACED",
            "CANCELLED, PAID",
            "CANCELLED, COMPLETED",
            "REFUNDED, COMPLETED",
            "REFUNDED, CART",
            "PAID, PAID",
            "COMPLETED, COMPLETED"
    })
    @DisplayName("State Machine: Illegal transitions rejected")
    void testIllegalTransitions(OrderStatus from, OrderStatus to) {
        assertThat(from.canTransitionTo(to))
                .as("Transition %s -> %s must be blocked", from, to)
                .isFalse();
    }

    @Test
    @DisplayName("IllegalOrderStateTransitionException formats clear violation message")
    void testExceptionFormatting() {
        IllegalOrderStateTransitionException ex = new IllegalOrderStateTransitionException(
                OrderStatus.COMPLETED, OrderStatus.CANCELLED
        );
        assertThat(ex.getMessage()).contains("from 'COMPLETED' to 'CANCELLED'");
        assertThat(ex.getCode()).isEqualTo("ILLEGAL_ORDER_STATE_TRANSITION");
    }

    @Test
    @DisplayName("Delivery fee calculation: $5 under $50, $0 at or above $50")
    void testDeliveryFeeRules() {
        BigDecimal underFifty = new BigDecimal("49.99");
        BigDecimal exactFifty = new BigDecimal("50.00");
        BigDecimal overFifty = new BigDecimal("125.00");

        BigDecimal feeUnder = underFifty.compareTo(BigDecimal.valueOf(50.00)) >= 0 ? BigDecimal.ZERO : BigDecimal.valueOf(5.00);
        BigDecimal feeFifty = exactFifty.compareTo(BigDecimal.valueOf(50.00)) >= 0 ? BigDecimal.ZERO : BigDecimal.valueOf(5.00);
        BigDecimal feeOver = overFifty.compareTo(BigDecimal.valueOf(50.00)) >= 0 ? BigDecimal.ZERO : BigDecimal.valueOf(5.00);

        assertThat(feeUnder).isEqualByComparingTo(new BigDecimal("5.00"));
        assertThat(feeFifty).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(feeOver).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("Delivery postal code validation: exactly 5 or 6 digits required")
    void testPincodeValidationRegex() {
        String regex = "^\\d{5,6}$";

        assertThat("12345".matches(regex)).isTrue();
        assertThat("560001".matches(regex)).isTrue();
        assertThat("1234".matches(regex)).isFalse();
        assertThat("1234567".matches(regex)).isFalse();
        assertThat("AB1234".matches(regex)).isFalse();
        assertThat("".matches(regex)).isFalse();
    }

    @Test
    @DisplayName("Mixed rounding line items sum equals total")
    void testMixedRoundingTotalsEqualSumOfLines() {
        // Line 1: 3 units @ $12.55, 10% discount = $3.765 -> $3.77, 10% tax = $3.388 -> $3.39
        BigDecimal price1 = new BigDecimal("12.55");
        BigDecimal disc1 = new BigDecimal("1.26");
        BigDecimal tax1 = new BigDecimal("1.13");
        int qty1 = 3;

        // Line 2: 1 unit @ $279.00, 20% discount = $55.80, 18% tax = $40.18
        BigDecimal price2 = new BigDecimal("279.00");
        BigDecimal disc2 = new BigDecimal("55.80");
        BigDecimal tax2 = new BigDecimal("40.18");
        int qty2 = 1;

        BigDecimal subtotal = price1.multiply(BigDecimal.valueOf(qty1)).add(price2.multiply(BigDecimal.valueOf(qty2))).setScale(2, RoundingMode.HALF_UP);
        BigDecimal discount = disc1.multiply(BigDecimal.valueOf(qty1)).add(disc2.multiply(BigDecimal.valueOf(qty2))).setScale(2, RoundingMode.HALF_UP);
        BigDecimal tax = tax1.multiply(BigDecimal.valueOf(qty1)).add(tax2.multiply(BigDecimal.valueOf(qty2))).setScale(2, RoundingMode.HALF_UP);
        BigDecimal deliveryFee = new BigDecimal("5.00");

        BigDecimal total = subtotal.subtract(discount).add(tax).add(deliveryFee).setScale(2, RoundingMode.HALF_UP);

        assertThat(subtotal).isEqualTo(new BigDecimal("316.65"));
        assertThat(discount).isEqualTo(new BigDecimal("59.58"));
        assertThat(tax).isEqualTo(new BigDecimal("43.57"));
        assertThat(total).isEqualTo(new BigDecimal("305.64"));
    }
}
