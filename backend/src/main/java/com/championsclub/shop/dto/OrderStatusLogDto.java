package com.championsclub.shop.dto;

import com.championsclub.shop.domain.OrderStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderStatusLogDto {
    private OrderStatus fromStatus;
    private OrderStatus toStatus;
    private String reason;
    private String changedByName;
    private Instant createdAt;
}
