package com.championsclub.shop.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CounterOrderCreateRequest {
    private UUID memberId; // optional (guest sale if null)
    private String guestName;
    private String guestPhone;
    private String guestEmail;

    @NotEmpty(message = "Order must contain at least one item")
    @Builder.Default
    private List<CartItemRequest> items = new ArrayList<>();

    @Builder.Default
    private String paymentMethod = "CASH"; // CASH, CARD, UPI, WALLET

    private String idempotencyKey;
}
