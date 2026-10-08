package com.championsclub.shop.dto;

import com.championsclub.shop.domain.OrderFulfilmentType;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckoutRequest {

    @NotNull(message = "Fulfilment type is required (PICKUP or DELIVERY)")
    private OrderFulfilmentType fulfilmentType;

    private String deliveryAddress;
    private String deliveryCity;
    private String deliveryPincode;
    private String deliveryNotes;

    @Builder.Default
    private String paymentMethod = "WALLET"; // WALLET, CARD, UPI, CASH

    private String idempotencyKey;
}
