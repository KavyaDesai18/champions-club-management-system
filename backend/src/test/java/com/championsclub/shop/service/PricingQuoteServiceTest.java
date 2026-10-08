package com.championsclub.shop.service;

import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.shop.domain.Inventory;
import com.championsclub.shop.domain.StockStatus;
import com.championsclub.shop.dto.PriceQuoteResponse;
import com.championsclub.shop.repo.ClubServiceRepository;
import com.championsclub.shop.repo.ProductVariantRepository;
import com.championsclub.member.repo.MemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@ExtendWith(MockitoExtension.class)
public class PricingQuoteServiceTest {

    @Mock private ProductVariantRepository variantRepository;
    @Mock private ClubServiceRepository serviceRepository;
    @Mock private MemberRepository memberRepository;

    private PricingQuoteService pricingQuoteService;

    @BeforeEach
    void setUp() {
        pricingQuoteService = new PricingQuoteService(variantRepository, serviceRepository, memberRepository);
    }

    @Test
    @DisplayName("Availability Math: available = max(0, on_hand - reserved)")
    void testAvailabilityMath() {
        Inventory inv1 = Inventory.builder().onHand(10).reserved(3).build();
        assertThat(inv1.getAvailable()).isEqualTo(7);

        Inventory inv2 = Inventory.builder().onHand(5).reserved(5).build();
        assertThat(inv2.getAvailable()).isEqualTo(0);

        Inventory inv3 = Inventory.builder().onHand(2).reserved(0).build();
        assertThat(inv3.getAvailable()).isEqualTo(2);

        Inventory inv4 = Inventory.builder().onHand(0).reserved(0).build();
        assertThat(inv4.getAvailable()).isEqualTo(0);
    }

    @ParameterizedTest(name = "{index} => Base:{0}, Discount:{1}%, TaxCategory:{2} -> ExpectedDiscount:{3}, ExpectedTax:{4}, ExpectedFinal:{5}")
    @CsvSource({
            // Base, DiscountPct, TaxCategory, ExpectedDiscount, ExpectedTax, ExpectedFinal
            "100.00,  0.00, STANDARD,   0.00, 18.00, 118.00",
            "100.00, 10.00, STANDARD,  10.00, 16.20, 106.20",
            "100.00, 20.00, STANDARD,  20.00, 14.40,  94.40",
            "100.00, 15.00, REDUCED,   15.00,  4.25,  89.25",
            "100.00, 25.00, EXEMPT,    25.00,  0.00,  75.00",
            // Tricky rounding test cases (e.g. $249.99 racket with 20% Gold VIP discount, 18% standard VAT)
            "249.99, 20.00, STANDARD,  50.00, 36.00, 235.99",
            // $79.99 shoes with 10% Silver discount (10% of 79.99 = 8.00, net 71.99, 18% tax of 71.99 = 12.96, final 84.95)
            "79.99,  10.00, STANDARD,   8.00, 12.96,  84.95",
            // $34.50 shuttlecocks with 15% Junior discount (15% of 34.50 = 5.18, net 29.32, 5% reduced tax of 29.32 = 1.47, final 30.79)
            "34.50,  15.00, REDUCED,    5.18,  1.47,  30.79",
            // Free / zero price edge case
            "0.00,   20.00, STANDARD,   0.00,  0.00,   0.00"
    })
    @DisplayName("Discount and Tax Rounding Table (HALF_UP minor units validation)")
    void testDiscountAndTaxRoundingTable(
            String baseStr,
            String discountStr,
            String taxCat,
            String expectedDiscountStr,
            String expectedTaxStr,
            String expectedFinalStr
    ) {
        BigDecimal base = new BigDecimal(baseStr);
        BigDecimal discountPct = new BigDecimal(discountStr);
        BigDecimal expectedDiscount = new BigDecimal(expectedDiscountStr);
        BigDecimal expectedTax = new BigDecimal(expectedTaxStr);
        BigDecimal expectedFinal = new BigDecimal(expectedFinalStr);

        PriceQuoteResponse quote = pricingQuoteService.calculatePriceBreakdown(
                UUID.randomUUID(),
                null,
                "Test Product",
                "SKU-TEST",
                1,
                base,
                discountPct,
                taxCat,
                "TEST_TIER"
        );

        assertThat(quote.getUnitDiscount()).isEqualByComparingTo(expectedDiscount);
        assertThat(quote.getUnitTax()).isEqualByComparingTo(expectedTax);
        assertThat(quote.getUnitFinalPrice()).isEqualByComparingTo(expectedFinal);
        assertThat(quote.getTotalFinalPrice()).isEqualByComparingTo(expectedFinal);
    }

    @Test
    @DisplayName("Multi-quantity totals multiplication")
    void testMultiQuantityTotals() {
        BigDecimal base = new BigDecimal("50.00");
        BigDecimal discountPct = new BigDecimal("10.00"); // $5 discount -> $45 net -> 18% tax ($8.10) -> $53.10 final
        int qty = 4;

        PriceQuoteResponse quote = pricingQuoteService.calculatePriceBreakdown(
                UUID.randomUUID(),
                null,
                "Wilson Tennis Balls Can",
                "BALL-01",
                qty,
                base,
                discountPct,
                "STANDARD",
                "SILVER"
        );

        assertThat(quote.getUnitBasePrice()).isEqualByComparingTo(new BigDecimal("50.00"));
        assertThat(quote.getUnitDiscount()).isEqualByComparingTo(new BigDecimal("5.00"));
        assertThat(quote.getUnitNetPrice()).isEqualByComparingTo(new BigDecimal("45.00"));
        assertThat(quote.getUnitTax()).isEqualByComparingTo(new BigDecimal("8.10"));
        assertThat(quote.getUnitFinalPrice()).isEqualByComparingTo(new BigDecimal("53.10"));

        assertThat(quote.getTotalBasePrice()).isEqualByComparingTo(new BigDecimal("200.00"));
        assertThat(quote.getTotalDiscount()).isEqualByComparingTo(new BigDecimal("20.00"));
        assertThat(quote.getTotalTax()).isEqualByComparingTo(new BigDecimal("32.40"));
        assertThat(quote.getTotalFinalPrice()).isEqualByComparingTo(new BigDecimal("212.40"));
    }

    @Test
    @DisplayName("Edge Case: Quantity <= 0 is rejected")
    void testInvalidQuantityRejection() {
        assertThatThrownBy(() -> pricingQuoteService.calculateQuote(
                com.championsclub.shop.dto.PriceQuoteRequest.builder()
                        .variantId(UUID.randomUUID())
                        .quantity(0)
                        .build()
        )).isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Quantity must be greater than zero");
    }
}
