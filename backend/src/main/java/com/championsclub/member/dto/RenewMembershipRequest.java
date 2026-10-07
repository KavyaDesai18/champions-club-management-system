package com.championsclub.member.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RenewMembershipRequest {
    private String planCode;
    private BigDecimal pricePaid;
    private String paymentRef;
    private String notes;
}
