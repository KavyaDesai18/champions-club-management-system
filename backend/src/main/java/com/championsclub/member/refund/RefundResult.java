package com.championsclub.member.refund;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;

@Value
@Builder
public class RefundResult {
    boolean success;
    BigDecimal refundableAmount;
    String refundReference;
    String note;
}
