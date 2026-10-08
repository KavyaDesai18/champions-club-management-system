package com.championsclub.shop.domain;

public enum OrderStatus {
    CART,
    PLACED,
    PAID,
    PACKED,
    READY,
    OUT_FOR_DELIVERY,
    COMPLETED,
    CANCELLED,
    REFUNDED;

    public boolean canTransitionTo(OrderStatus next) {
        if (this == next) {
            return false;
        }
        return switch (this) {
            case CART -> next == PLACED || next == CANCELLED;
            case PLACED -> next == PAID || next == CANCELLED;
            case PAID -> next == PACKED || next == COMPLETED || next == CANCELLED;
            case PACKED -> next == READY || next == OUT_FOR_DELIVERY || next == CANCELLED;
            case READY -> next == COMPLETED || next == CANCELLED;
            case OUT_FOR_DELIVERY -> next == COMPLETED || next == CANCELLED;
            case COMPLETED -> next == REFUNDED;
            case CANCELLED, REFUNDED -> false;
        };
    }
}
