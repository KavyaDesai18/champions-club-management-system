package com.championsclub.shop.exception;

import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.shop.domain.OrderStatus;

public class IllegalOrderStateTransitionException extends BusinessValidationException {

    public IllegalOrderStateTransitionException(OrderStatus fromStatus, OrderStatus toStatus) {
        super(String.format("Illegal order state transition from '%s' to '%s'", fromStatus, toStatus),
                "ILLEGAL_ORDER_STATE_TRANSITION");
    }

    public IllegalOrderStateTransitionException(String message) {
        super(message, "ILLEGAL_ORDER_STATE_TRANSITION");
    }
}
