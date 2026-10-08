package com.championsclub.shop.dto;

import com.championsclub.shop.domain.OrderChannel;
import com.championsclub.shop.domain.OrderFulfilmentType;
import com.championsclub.shop.domain.OrderStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderResponse {
    private UUID id;
    private String orderNo;
    private UUID memberId;
    private String customerName;
    private String guestPhone;
    private String guestEmail;
    private OrderChannel channel;
    private OrderFulfilmentType fulfilmentType;
    private OrderStatus status;
    private BigDecimal subtotal;
    private BigDecimal discount;
    private BigDecimal tax;
    private BigDecimal deliveryFee;
    private BigDecimal total;
    private String pickupCode;
    private String deliveryAddress;
    private String deliveryCity;
    private String deliveryPincode;
    private String deliveryNotes;
    private String paymentMethod;
    private String paymentReference;
    private Instant paidAt;
    private Instant placedAt;
    private Instant packedAt;
    private Instant readyAt;
    private Instant outForDeliveryAt;
    private Instant completedAt;
    private Instant cancelledAt;
    private String cancellationReason;
    private String refundReference;
    private BigDecimal refundAmount;
    private Instant refundedAt;
    private Long version;
    private Instant createdAt;
    private Instant updatedAt;
    @Builder.Default
    private List<OrderItemResponse> items = new ArrayList<>();
    @Builder.Default
    private List<OrderStatusLogDto> statusLogs = new ArrayList<>();
}
