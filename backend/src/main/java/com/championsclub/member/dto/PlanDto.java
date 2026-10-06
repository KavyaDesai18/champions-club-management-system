package com.championsclub.member.dto;

import com.championsclub.member.domain.Plan;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlanDto {
    private UUID id;
    private String code;
    private String name;
    private BigDecimal price;
    private Integer durationMonths;
    private BigDecimal courtDiscountPct;
    private BigDecimal shopDiscountPct;
    private BigDecimal barDiscountPct;
    private Boolean freeCourts;
    private Integer maxBookingsPerDay;
    private Integer advanceBookingDays;
    private Boolean active;
    private List<String> benefits;

    public static PlanDto fromEntity(Plan plan) {
        if (plan == null) return null;
        List<String> benefitTexts = plan.getBenefits() != null
                ? plan.getBenefits().stream().map(b -> b.getBenefitText()).toList()
                : List.of();

        return PlanDto.builder()
                .id(plan.getId())
                .code(plan.getCode())
                .name(plan.getName())
                .price(plan.getPrice())
                .durationMonths(plan.getDurationMonths())
                .courtDiscountPct(plan.getCourtDiscountPct())
                .shopDiscountPct(plan.getShopDiscountPct())
                .barDiscountPct(plan.getBarDiscountPct())
                .freeCourts(plan.getFreeCourts())
                .maxBookingsPerDay(plan.getMaxBookingsPerDay())
                .advanceBookingDays(plan.getAdvanceBookingDays())
                .active(plan.getActive())
                .benefits(benefitTexts)
                .build();
    }
}
