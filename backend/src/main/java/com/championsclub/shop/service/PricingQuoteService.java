package com.championsclub.shop.service;

import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.member.domain.Member;
import com.championsclub.member.domain.Plan;
import com.championsclub.member.repo.MemberRepository;
import com.championsclub.shop.domain.ClubService;
import com.championsclub.shop.domain.ProductVariant;
import com.championsclub.shop.dto.PriceQuoteRequest;
import com.championsclub.shop.dto.PriceQuoteResponse;
import com.championsclub.shop.repo.ClubServiceRepository;
import com.championsclub.shop.repo.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PricingQuoteService {

    private final ProductVariantRepository variantRepository;
    private final ClubServiceRepository serviceRepository;
    private final MemberRepository memberRepository;

    public static final BigDecimal STANDARD_TAX_RATE = new BigDecimal("18.00");
    public static final BigDecimal REDUCED_TAX_RATE = new BigDecimal("5.00");
    public static final BigDecimal EXEMPT_TAX_RATE = BigDecimal.ZERO;

    @Transactional(readOnly = true)
    public PriceQuoteResponse calculateQuote(PriceQuoteRequest request) {
        if (request.getQuantity() == null || request.getQuantity() <= 0) {
            throw new BusinessValidationException("Quantity must be greater than zero", "INVALID_QUANTITY");
        }

        BigDecimal unitBasePrice;
        String itemName;
        String sku;
        String taxCategory;
        UUID variantId = request.getVariantId();
        UUID serviceId = request.getServiceId();

        if (variantId != null) {
            ProductVariant variant = variantRepository.findByIdAndIsDeletedFalse(variantId)
                    .orElseThrow(() -> new ResourceNotFoundException("Product variant not found: " + variantId));
            unitBasePrice = variant.getEffectivePrice();
            itemName = variant.getProduct().getName();
            sku = variant.getSku();
            taxCategory = variant.getProduct().getTaxCategory() != null ? variant.getProduct().getTaxCategory() : "STANDARD";
        } else if (serviceId != null) {
            ClubService service = serviceRepository.findById(serviceId)
                    .orElseThrow(() -> new ResourceNotFoundException("Club service not found: " + serviceId));
            unitBasePrice = service.getBasePrice();
            itemName = service.getName();
            sku = service.getCode();
            taxCategory = "STANDARD";
        } else {
            throw new BusinessValidationException("Either variantId or serviceId must be provided for quote", "MISSING_ITEM");
        }

        // Determine plan discount
        BigDecimal discountPct = BigDecimal.ZERO;
        String appliedTier = "STANDARD_GUEST";

        if (request.getMemberId() != null) {
            Member member = memberRepository.findByIdAndIsDeletedFalse(request.getMemberId()).orElse(null);
            if (member != null && member.getPlan() != null) {
                Plan plan = member.getPlan();
                if (plan.getShopDiscountPct() != null) {
                    discountPct = plan.getShopDiscountPct();
                }
                appliedTier = plan.getCode();
            }
        }

        return calculatePriceBreakdown(
                variantId,
                serviceId,
                itemName,
                sku,
                request.getQuantity(),
                unitBasePrice,
                discountPct,
                taxCategory,
                appliedTier
        );
    }

    /**
     * Pure calculation method (used also in direct unit testing).
     */
    public PriceQuoteResponse calculatePriceBreakdown(
            UUID variantId,
            UUID serviceId,
            String itemName,
            String sku,
            int quantity,
            BigDecimal unitBasePrice,
            BigDecimal discountPct,
            String taxCategory,
            String appliedTier
    ) {
        if (unitBasePrice == null) unitBasePrice = BigDecimal.ZERO;
        if (discountPct == null) discountPct = BigDecimal.ZERO;
        if (taxCategory == null) taxCategory = "STANDARD";

        BigDecimal taxRatePct = resolveTaxRate(taxCategory);

        // Calculate unit discount with HALF_UP rounding
        BigDecimal unitDiscount = unitBasePrice
                .multiply(discountPct)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        BigDecimal unitNetPrice = unitBasePrice.subtract(unitDiscount);

        // Calculate unit tax on net price with HALF_UP rounding
        BigDecimal unitTax = unitNetPrice
                .multiply(taxRatePct)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        BigDecimal unitFinalPrice = unitNetPrice.add(unitTax);

        BigDecimal qty = BigDecimal.valueOf(quantity);
        BigDecimal totalBase = unitBasePrice.multiply(qty);
        BigDecimal totalDiscount = unitDiscount.multiply(qty);
        BigDecimal totalTax = unitTax.multiply(qty);
        BigDecimal totalFinal = unitFinalPrice.multiply(qty);

        return PriceQuoteResponse.builder()
                .variantId(variantId)
                .serviceId(serviceId)
                .itemName(itemName)
                .sku(sku)
                .quantity(quantity)
                .unitBasePrice(unitBasePrice.setScale(2, RoundingMode.HALF_UP))
                .discountPercentage(discountPct.setScale(2, RoundingMode.HALF_UP))
                .unitDiscount(unitDiscount)
                .unitNetPrice(unitNetPrice)
                .taxCategory(taxCategory)
                .taxRatePercentage(taxRatePct.setScale(2, RoundingMode.HALF_UP))
                .unitTax(unitTax)
                .unitFinalPrice(unitFinalPrice)
                .totalBasePrice(totalBase)
                .totalDiscount(totalDiscount)
                .totalTax(totalTax)
                .totalFinalPrice(totalFinal)
                .appliedTier(appliedTier)
                .build();
    }

    public BigDecimal resolveTaxRate(String taxCategory) {
        if (taxCategory == null) return STANDARD_TAX_RATE;
        return switch (taxCategory.toUpperCase()) {
            case "REDUCED" -> REDUCED_TAX_RATE;
            case "EXEMPT" -> EXEMPT_TAX_RATE;
            default -> STANDARD_TAX_RATE;
        };
    }
}
