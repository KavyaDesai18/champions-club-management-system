package com.championsclub.shop.service;

import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.member.domain.Member;
import com.championsclub.member.domain.MemberStatus;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.MemberRepository;
import com.championsclub.notification.domain.NotificationType;
import com.championsclub.notification.service.NotificationDispatcher;
import com.championsclub.shop.domain.*;
import com.championsclub.shop.dto.*;
import com.championsclub.shop.exception.IllegalOrderStateTransitionException;
import com.championsclub.shop.repo.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShopOrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderStatusLogRepository orderStatusLogRepository;
    private final ProductVariantRepository variantRepository;
    private final ClubServiceRepository clubServiceRepository;
    private final MemberRepository memberRepository;
    private final InventoryRepository inventoryRepository;
    private final InventoryService inventoryService;
    private final PricingQuoteService pricingQuoteService;
    private final ShopSseHub shopSseHub;
    private final NotificationDispatcher notificationDispatcher;

    // ==========================================
    // 1. MEMBER SERVER-SIDE CART MANAGEMENT
    // ==========================================

    @Transactional
    public CartResponse getOrCreateCart(UUID memberId) {
        Member member = getActiveMember(memberId);
        Order cart = orderRepository.findByMemberIdAndStatus(memberId, OrderStatus.CART)
                .orElseGet(() -> createEmptyCart(member));
        return mapToCartResponse(cart);
    }

    @Transactional
    public CartResponse addItemToCart(UUID memberId, CartItemRequest req) {
        Member member = getActiveMember(memberId);
        if (req.getQty() <= 0) {
            throw new BusinessValidationException("Quantity must be greater than zero", "INVALID_QUANTITY");
        }

        Order cart = orderRepository.findByMemberIdAndStatus(memberId, OrderStatus.CART)
                .orElseGet(() -> createEmptyCart(member));

        if (req.getVariantId() != null) {
            ProductVariant variant = variantRepository.findById(req.getVariantId())
                    .orElseThrow(() -> new ResourceNotFoundException("ProductVariant", req.getVariantId().toString()));

            Optional<OrderItem> existingItem = cart.getItems().stream()
                    .filter(i -> i.getVariant() != null && i.getVariant().getId().equals(variant.getId()))
                    .findFirst();

            PriceQuoteResponse quote = pricingQuoteService.calculateQuote(
                    variant.getId(),
                    memberId,
                    existingItem.map(i -> i.getQty() + req.getQty()).orElse(req.getQty())
            );

            if (existingItem.isPresent()) {
                OrderItem item = existingItem.get();
                item.setQty(item.getQty() + req.getQty());
                item.setUnitPrice(quote.getUnitBasePrice());
                item.setUnitDiscount(quote.getUnitDiscount());
                item.setUnitTax(quote.getUnitTax());
                item.setTotalPrice(quote.getTotalFinalPrice());
            } else {
                OrderItem newItem = OrderItem.builder()
                        .variant(variant)
                        .itemType("PRODUCT")
                        .itemName(variant.getProduct().getName() + (variant.getSize() != null ? " (" + variant.getSize() + ")" : ""))
                        .sku(variant.getSku())
                        .qty(req.getQty())
                        .unitPrice(quote.getUnitBasePrice())
                        .unitDiscount(quote.getUnitDiscount())
                        .unitTax(quote.getUnitTax())
                        .totalPrice(quote.getTotalFinalPrice())
                        .build();
                cart.addItem(newItem);
            }
        } else if (req.getServiceId() != null) {
            ClubService service = clubServiceRepository.findById(req.getServiceId())
                    .orElseThrow(() -> new ResourceNotFoundException("ClubService", req.getServiceId().toString()));

            Optional<OrderItem> existingItem = cart.getItems().stream()
                    .filter(i -> i.getService() != null && i.getService().getId().equals(service.getId()))
                    .findFirst();

            BigDecimal price = service.getBasePrice();
            int qty = existingItem.map(i -> i.getQty() + req.getQty()).orElse(req.getQty());

            if (existingItem.isPresent()) {
                OrderItem item = existingItem.get();
                item.setQty(qty);
                item.setTotalPrice(price.multiply(BigDecimal.valueOf(qty)).setScale(2, RoundingMode.HALF_UP));
            } else {
                OrderItem newItem = OrderItem.builder()
                        .service(service)
                        .itemType("SERVICE")
                        .itemName(service.getName())
                        .sku(service.getCode())
                        .qty(req.getQty())
                        .unitPrice(price)
                        .unitDiscount(BigDecimal.ZERO)
                        .unitTax(BigDecimal.ZERO)
                        .totalPrice(price.multiply(BigDecimal.valueOf(req.getQty())).setScale(2, RoundingMode.HALF_UP))
                        .build();
                cart.addItem(newItem);
            }
        } else {
            throw new BusinessValidationException("Must specify either variantId or serviceId", "MISSING_ITEM_REFERENCE");
        }

        recalculateCartTotals(cart);
        Order saved = orderRepository.save(cart);
        return mapToCartResponse(saved);
    }

    @Transactional
    public CartResponse updateCartItemQty(UUID memberId, UUID orderItemId, int qty) {
        Member member = getActiveMember(memberId);
        Order cart = orderRepository.findByMemberIdAndStatus(memberId, OrderStatus.CART)
                .orElseThrow(() -> new ResourceNotFoundException("Active Cart for member not found"));

        OrderItem item = cart.getItems().stream()
                .filter(i -> i.getId().equals(orderItemId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("OrderItem", orderItemId.toString()));

        if (qty <= 0) {
            cart.removeItem(item);
            orderItemRepository.delete(item);
        } else {
            item.setQty(qty);
            if (item.getVariant() != null) {
                PriceQuoteResponse quote = pricingQuoteService.calculateQuote(item.getVariant().getId(), memberId, qty);
                item.setUnitPrice(quote.getUnitBasePrice());
                item.setUnitDiscount(quote.getUnitDiscount());
                item.setUnitTax(quote.getUnitTax());
                item.setTotalPrice(quote.getTotalFinalPrice());
            } else if (item.getService() != null) {
                item.setTotalPrice(item.getUnitPrice().multiply(BigDecimal.valueOf(qty)).setScale(2, RoundingMode.HALF_UP));
            }
        }

        recalculateCartTotals(cart);
        Order saved = orderRepository.save(cart);
        return mapToCartResponse(saved);
    }

    @Transactional
    public CartResponse removeCartItem(UUID memberId, UUID orderItemId) {
        return updateCartItemQty(memberId, orderItemId, 0);
    }

    @Transactional
    public CartResponse clearCart(UUID memberId) {
        Member member = getActiveMember(memberId);
        Order cart = orderRepository.findByMemberIdAndStatus(memberId, OrderStatus.CART)
                .orElseGet(() -> createEmptyCart(member));

        cart.getItems().clear();
        recalculateCartTotals(cart);
        Order saved = orderRepository.save(cart);
        return mapToCartResponse(saved);
    }

    // ==========================================
    // 2. PLACING AN ONLINE ORDER (RESERVE STOCK)
    // ==========================================

    @Transactional
    public OrderResponse placeOrder(UUID memberId, CheckoutRequest req, User currentUser) {
        Member member = getActiveMember(memberId);

        // Idempotency guard
        if (req.getIdempotencyKey() != null && !req.getIdempotencyKey().isBlank()) {
            Optional<Order> existing = orderRepository.findByIdempotencyKey(req.getIdempotencyKey().trim());
            if (existing.isPresent()) {
                log.info("Idempotent request hit for key: {}. Returning existing order: {}", req.getIdempotencyKey(), existing.get().getOrderNo());
                return mapToResponse(existing.get());
            }
        }

        Order cart = orderRepository.findByMemberIdAndStatus(memberId, OrderStatus.CART)
                .orElseThrow(() -> new BusinessValidationException("Active cart not found", "NO_ACTIVE_CART"));

        if (cart.getItems().isEmpty()) {
            throw new BusinessValidationException("Cannot place order with an empty cart", "EMPTY_CART");
        }

        // Validate fulfilment rules
        if (req.getFulfilmentType() == OrderFulfilmentType.DELIVERY) {
            if (req.getDeliveryAddress() == null || req.getDeliveryAddress().isBlank()) {
                throw new BusinessValidationException("Delivery address is required for delivery orders", "MISSING_DELIVERY_ADDRESS");
            }
            if (req.getDeliveryCity() == null || req.getDeliveryCity().isBlank()) {
                throw new BusinessValidationException("Delivery city is required", "MISSING_DELIVERY_CITY");
            }
            if (req.getDeliveryPincode() == null || !req.getDeliveryPincode().matches("^\\d{5,6}$")) {
                throw new BusinessValidationException("A valid 5 or 6-digit postal code is required for delivery", "INVALID_PINCODE");
            }
            if (cart.getSubtotal().compareTo(BigDecimal.valueOf(20.00)) < 0) {
                throw new BusinessValidationException("Minimum order subtotal for delivery is $20.00", "MIN_DELIVERY_ORDER_NOT_MET");
            }

            // Delivery fee: $5.00 flat, free if subtotal >= $50.00
            BigDecimal deliveryFee = cart.getSubtotal().compareTo(BigDecimal.valueOf(50.00)) >= 0
                    ? BigDecimal.ZERO
                    : BigDecimal.valueOf(5.00);

            cart.setDeliveryFee(deliveryFee);
            cart.setDeliveryAddress(req.getDeliveryAddress());
            cart.setDeliveryCity(req.getDeliveryCity());
            cart.setDeliveryPincode(req.getDeliveryPincode());
            cart.setDeliveryNotes(req.getDeliveryNotes());
            cart.setPickupCode(null);
        } else {
            // PICKUP or INSTORE
            cart.setDeliveryFee(BigDecimal.ZERO);
            cart.setDeliveryAddress(null);
            cart.setDeliveryCity(null);
            cart.setDeliveryPincode(null);
            cart.setDeliveryNotes(null);
            cart.setPickupCode("PU-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase());
        }

        // Atomic Stock Reservation for each variant item
        for (OrderItem item : cart.getItems()) {
            if (item.getVariant() != null) {
                inventoryService.reserveStock(
                        item.getVariant().getId(),
                        item.getQty(),
                        cart.getOrderNo(),
                        "Online order placement hold: " + cart.getOrderNo(),
                        currentUser
                );
            }
        }

        // Recalculate final total with delivery fee
        recalculateCartTotals(cart);

        // Transition status from CART -> PLACED
        OrderStatus fromStatus = cart.getStatus();
        cart.setStatus(OrderStatus.PLACED);
        cart.setPlacedAt(Instant.now());
        cart.setFulfilmentType(req.getFulfilmentType());
        cart.setPaymentMethod(req.getPaymentMethod() != null ? req.getPaymentMethod() : "WALLET");
        cart.setIdempotencyKey(req.getIdempotencyKey());
        cart.setCreatedBy(currentUser);

        logStatusTransition(cart, fromStatus, OrderStatus.PLACED, "Order placed by member", currentUser);
        Order savedOrder = orderRepository.save(cart);

        shopSseHub.broadcastEvent("ORDER_PLACED", Map.of(
                "orderId", savedOrder.getId().toString(),
                "orderNo", savedOrder.getOrderNo(),
                "fulfilmentType", savedOrder.getFulfilmentType().name(),
                "total", savedOrder.getTotal()
        ));

        return mapToResponse(savedOrder);
    }

    // ==========================================
    // 3. PAYMENT COMPLETION & FULFILLMENT
    // ==========================================

    @Transactional
    public OrderResponse payOrder(UUID orderId, String paymentMethod, String paymentRef, User currentUser) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", orderId.toString()));

        if (!order.getStatus().canTransitionTo(OrderStatus.PAID)) {
            throw new IllegalOrderStateTransitionException(order.getStatus(), OrderStatus.PAID);
        }

        // Convert reserved stock into confirmed sale
        for (OrderItem item : order.getItems()) {
            if (item.getVariant() != null) {
                inventoryService.fulfillReservedSale(
                        item.getVariant().getId(),
                        item.getQty(),
                        order.getOrderNo(),
                        "Order paid: " + order.getOrderNo(),
                        currentUser
                );
            }
        }

        OrderStatus fromStatus = order.getStatus();
        order.setStatus(OrderStatus.PAID);
        order.setPaidAt(Instant.now());
        order.setPaymentMethod(paymentMethod != null ? paymentMethod : order.getPaymentMethod());
        order.setPaymentReference(paymentRef != null ? paymentRef : "PAY-" + System.currentTimeMillis());

        logStatusTransition(order, fromStatus, OrderStatus.PAID, "Payment completed successfully", currentUser);

        // If INSTORE fulfilment, advance directly to COMPLETED
        if (order.getFulfilmentType() == OrderFulfilmentType.INSTORE) {
            order.setStatus(OrderStatus.COMPLETED);
            order.setCompletedAt(Instant.now());
            logStatusTransition(order, OrderStatus.PAID, OrderStatus.COMPLETED, "In-store counter order completed", currentUser);
        }

        Order saved = orderRepository.save(order);

        shopSseHub.broadcastEvent("ORDER_PAID", Map.of(
                "orderId", saved.getId().toString(),
                "orderNo", saved.getOrderNo(),
                "status", saved.getStatus().name()
        ));

        // Dispatch Member Notification
        if (saved.getMember() != null) {
            try {
                notificationDispatcher.dispatch(
                        saved.getMember().getUser(),
                        saved.getMember(),
                        "Order #" + saved.getOrderNo() + " Confirmed",
                        "Your payment of $" + saved.getTotal() + " was confirmed for order #" + saved.getOrderNo() +
                                (saved.getPickupCode() != null ? ". Pickup code: " + saved.getPickupCode() : ""),
                        NotificationType.SHOP_ORDER,
                        null
                );
            } catch (Exception e) {
                log.warn("Failed to dispatch order confirmation notification: {}", e.getMessage());
            }
        }

        return mapToResponse(saved);
    }

    // ==========================================
    // 4. COUNTER POS & QUICK SALE (UNDER 3 TAPS)
    // ==========================================

    @Transactional
    public OrderResponse createCounterSale(CounterOrderCreateRequest req, User currentUser) {
        // Idempotency guard
        if (req.getIdempotencyKey() != null && !req.getIdempotencyKey().isBlank()) {
            Optional<Order> existing = orderRepository.findByIdempotencyKey(req.getIdempotencyKey().trim());
            if (existing.isPresent()) {
                return mapToResponse(existing.get());
            }
        }

        Member member = null;
        if (req.getMemberId() != null) {
            member = getActiveMember(req.getMemberId());
        }

        String orderNo = "ORD-POS-" + System.currentTimeMillis();
        Order order = Order.builder()
                .orderNo(orderNo)
                .member(member)
                .guestName(member != null ? member.getFullName() : (req.getGuestName() != null ? req.getGuestName() : "Walk-in Guest"))
                .guestPhone(member != null ? member.getPhone() : req.getGuestPhone())
                .guestEmail(member != null ? member.getEmail() : req.getGuestEmail())
                .channel(OrderChannel.COUNTER)
                .fulfilmentType(OrderFulfilmentType.INSTORE)
                .status(OrderStatus.COMPLETED)
                .paymentMethod(req.getPaymentMethod() != null ? req.getPaymentMethod() : "CASH")
                .paymentReference("POS-" + System.currentTimeMillis())
                .paidAt(Instant.now())
                .placedAt(Instant.now())
                .completedAt(Instant.now())
                .idempotencyKey(req.getIdempotencyKey())
                .createdBy(currentUser)
                .build();

        for (CartItemRequest itemReq : req.getItems()) {
            if (itemReq.getQty() <= 0) {
                throw new BusinessValidationException("Item quantity must be positive", "INVALID_QUANTITY");
            }

            if (itemReq.getVariantId() != null) {
                ProductVariant variant = variantRepository.findById(itemReq.getVariantId())
                        .orElseThrow(() -> new ResourceNotFoundException("ProductVariant", itemReq.getVariantId().toString()));

                // Atomic deduction directly at DB level (no overselling possible)
                inventoryService.deductStockForSale(
                        variant.getId(),
                        itemReq.getQty(),
                        orderNo,
                        "Counter POS Quick Sale",
                        currentUser
                );

                PriceQuoteResponse quote = pricingQuoteService.calculateQuote(
                        variant.getId(),
                        member != null ? member.getId() : null,
                        itemReq.getQty()
                );

                OrderItem line = OrderItem.builder()
                        .variant(variant)
                        .itemType("PRODUCT")
                        .itemName(variant.getProduct().getName() + (variant.getSize() != null ? " (" + variant.getSize() + ")" : ""))
                        .sku(variant.getSku())
                        .qty(itemReq.getQty())
                        .unitPrice(quote.getUnitBasePrice())
                        .unitDiscount(quote.getUnitDiscount())
                        .unitTax(quote.getUnitTax())
                        .totalPrice(quote.getTotalFinalPrice())
                        .build();
                order.addItem(line);

            } else if (itemReq.getServiceId() != null) {
                ClubService service = clubServiceRepository.findById(itemReq.getServiceId())
                        .orElseThrow(() -> new ResourceNotFoundException("ClubService", itemReq.getServiceId().toString()));

                BigDecimal price = service.getBasePrice();
                BigDecimal total = price.multiply(BigDecimal.valueOf(itemReq.getQty())).setScale(2, RoundingMode.HALF_UP);

                OrderItem line = OrderItem.builder()
                        .service(service)
                        .itemType("SERVICE")
                        .itemName(service.getName())
                        .sku(service.getCode())
                        .qty(itemReq.getQty())
                        .unitPrice(price)
                        .unitDiscount(BigDecimal.ZERO)
                        .unitTax(BigDecimal.ZERO)
                        .totalPrice(total)
                        .build();
                order.addItem(line);
            }
        }

        recalculateCartTotals(order);
        Order saved = orderRepository.save(order);
        logStatusTransition(saved, OrderStatus.CART, OrderStatus.COMPLETED, "Counter sale completed", currentUser);

        shopSseHub.broadcastEvent("COUNTER_SALE", Map.of(
                "orderNo", saved.getOrderNo(),
                "total", saved.getTotal()
        ));

        return mapToResponse(saved);
    }

    // ==========================================
    // 5. STATUS MACHINE TRANSITIONS & CANCEL/REFUND
    // ==========================================

    @Transactional
    public OrderResponse updateOrderStatus(UUID orderId, OrderStatus newStatus, String reason, User currentUser) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", orderId.toString()));

        OrderStatus oldStatus = order.getStatus();
        if (!oldStatus.canTransitionTo(newStatus)) {
            throw new IllegalOrderStateTransitionException(oldStatus, newStatus);
        }

        // Side-effects on stock
        if (newStatus == OrderStatus.CANCELLED) {
            if (oldStatus == OrderStatus.PLACED) {
                // Was reserved, release reservation
                for (OrderItem item : order.getItems()) {
                    if (item.getVariant() != null) {
                        inventoryService.releaseReservedStock(
                                item.getVariant().getId(),
                                item.getQty(),
                                order.getOrderNo(),
                                "Order cancelled hold release: " + (reason != null ? reason : "Cancelled before payment"),
                                currentUser
                        );
                    }
                }
            } else if (oldStatus == OrderStatus.PAID || oldStatus == OrderStatus.PACKED ||
                       oldStatus == OrderStatus.READY || oldStatus == OrderStatus.OUT_FOR_DELIVERY) {
                // Was already paid and deducted from stock, return items
                for (OrderItem item : order.getItems()) {
                    if (item.getVariant() != null) {
                        inventoryService.returnItem(
                                item.getVariant().getId(),
                                item.getQty(),
                                order.getOrderNo(),
                                "Cancelled order stock return: " + (reason != null ? reason : "Staff cancellation"),
                                currentUser
                        );
                    }
                }
            }
            order.setCancelledAt(Instant.now());
            order.setCancellationReason(reason != null ? reason : "Order cancelled");
        } else if (newStatus == OrderStatus.REFUNDED) {
            // Customer return of completed order
            for (OrderItem item : order.getItems()) {
                if (item.getVariant() != null) {
                    inventoryService.returnItem(
                            item.getVariant().getId(),
                            item.getQty(),
                            order.getOrderNo(),
                            "Refund return: " + (reason != null ? reason : "Customer return"),
                            currentUser
                    );
                }
            }
            order.setRefundedAt(Instant.now());
            order.setRefundReference("REF-" + System.currentTimeMillis());
            order.setRefundAmount(order.getTotal());
        } else if (newStatus == OrderStatus.PACKED) {
            order.setPackedAt(Instant.now());
        } else if (newStatus == OrderStatus.READY) {
            order.setReadyAt(Instant.now());
            if (order.getPickupCode() == null) {
                order.setPickupCode("PU-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase());
            }
            if (order.getMember() != null) {
                try {
                    notificationDispatcher.dispatch(
                            order.getMember().getUser(),
                            order.getMember(),
                            "Order Ready for Pickup!",
                            "Your order #" + order.getOrderNo() + " is packed and ready at the Pro Shop counter! Show pickup code: " + order.getPickupCode(),
                            NotificationType.SHOP_ORDER,
                            null
                    );
                } catch (Exception e) {
                    log.warn("Failed to dispatch ready notification: {}", e.getMessage());
                }
            }
        } else if (newStatus == OrderStatus.OUT_FOR_DELIVERY) {
            order.setOutForDeliveryAt(Instant.now());
            if (order.getMember() != null) {
                try {
                    notificationDispatcher.dispatch(
                            order.getMember().getUser(),
                            order.getMember(),
                            "Order Out for Delivery",
                            "Your order #" + order.getOrderNo() + " is with our delivery courier on the way to " + order.getDeliveryAddress(),
                            NotificationType.SHOP_ORDER,
                            null
                    );
                } catch (Exception e) {
                    log.warn("Failed to dispatch out for delivery notification: {}", e.getMessage());
                }
            }
        } else if (newStatus == OrderStatus.COMPLETED) {
            order.setCompletedAt(Instant.now());
        }

        order.setStatus(newStatus);
        logStatusTransition(order, oldStatus, newStatus, reason, currentUser);
        Order saved = orderRepository.save(order);

        shopSseHub.broadcastEvent("ORDER_STATUS_CHANGED", Map.of(
                "orderId", saved.getId().toString(),
                "orderNo", saved.getOrderNo(),
                "fromStatus", oldStatus.name(),
                "toStatus", newStatus.name()
        ));

        return mapToResponse(saved);
    }

    // ==========================================
    // 6. TIMEOUT JOB: RELEASE EXPIRED PLACED ORDERS
    // ==========================================

    @Transactional
    public int expirePlacedOrders(Instant cutoff) {
        List<Order> expiredOrders = orderRepository.findByStatusAndPlacedAtBefore(OrderStatus.PLACED, cutoff);
        int count = 0;
        for (Order order : expiredOrders) {
            log.info("Expiring placed order {} due to payment timeout (placed at {})", order.getOrderNo(), order.getPlacedAt());
            for (OrderItem item : order.getItems()) {
                if (item.getVariant() != null) {
                    try {
                        inventoryService.releaseReservedStock(
                                item.getVariant().getId(),
                                item.getQty(),
                                order.getOrderNo(),
                                "Payment timeout (15 min elapsed) - auto-release",
                                null
                        );
                    } catch (Exception e) {
                        log.warn("Failed to release reserved stock for item {}: {}", item.getId(), e.getMessage());
                    }
                }
            }
            order.setStatus(OrderStatus.CANCELLED);
            order.setCancelledAt(Instant.now());
            order.setCancellationReason("Payment timeout (15 min elapsed)");
            logStatusTransition(order, OrderStatus.PLACED, OrderStatus.CANCELLED, "Payment timeout (15 min elapsed)", null);
            orderRepository.save(order);
            count++;
        }
        return count;
    }

    // ==========================================
    // 7. QUERIES & REVIEWS
    // ==========================================

    @Transactional(readOnly = true)
    public Page<OrderResponse> getOrders(OrderStatus status, OrderChannel channel, String search, Pageable pageable) {
        return orderRepository.searchOrders(status, channel, search, pageable)
                .map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getQueueOrders() {
        return orderRepository.findByStatusInOrderByCreatedAtDesc(List.of(
                OrderStatus.PLACED,
                OrderStatus.PAID,
                OrderStatus.PACKED,
                OrderStatus.READY,
                OrderStatus.OUT_FOR_DELIVERY
        )).stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrderById(UUID id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order", id.toString()));
        return mapToResponse(order);
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrderByOrderNo(String orderNo) {
        Order order = orderRepository.findByOrderNo(orderNo)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with orderNo: " + orderNo));
        return mapToResponse(order);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getMemberOrders(UUID memberId) {
        return orderRepository.findByMemberIdOrderByCreatedAtDesc(memberId).stream()
                .filter(o -> o.getStatus() != OrderStatus.CART)
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // ==========================================
    // INTERNAL HELPERS
    // ==========================================

    private Member getActiveMember(UUID memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Member", memberId.toString()));
        if (member.getStatus() == MemberStatus.SUSPENDED) {
            throw new BusinessValidationException("Member is suspended. Shop transactions are blocked.", "MEMBER_SUSPENDED");
        }
        return member;
    }

    private Order createEmptyCart(Member member) {
        String orderNo = "ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Order cart = Order.builder()
                .orderNo(orderNo)
                .member(member)
                .guestName(member.getFullName())
                .guestPhone(member.getPhone())
                .guestEmail(member.getEmail())
                .channel(OrderChannel.ONLINE)
                .fulfilmentType(OrderFulfilmentType.PICKUP)
                .status(OrderStatus.CART)
                .build();
        return orderRepository.save(cart);
    }

    private void recalculateCartTotals(Order order) {
        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal discount = BigDecimal.ZERO;
        BigDecimal tax = BigDecimal.ZERO;

        for (OrderItem item : order.getItems()) {
            BigDecimal qty = BigDecimal.valueOf(item.getQty());
            subtotal = subtotal.add(item.getUnitPrice().multiply(qty));
            discount = discount.add(item.getUnitDiscount().multiply(qty));
            tax = tax.add(item.getUnitTax().multiply(qty));
        }

        order.setSubtotal(subtotal.setScale(2, RoundingMode.HALF_UP));
        order.setDiscount(discount.setScale(2, RoundingMode.HALF_UP));
        order.setTax(tax.setScale(2, RoundingMode.HALF_UP));

        BigDecimal fee = order.getDeliveryFee() != null ? order.getDeliveryFee() : BigDecimal.ZERO;
        BigDecimal total = subtotal.subtract(discount).add(tax).add(fee).setScale(2, RoundingMode.HALF_UP);
        order.setTotal(total.max(BigDecimal.ZERO));
    }

    private void logStatusTransition(Order order, OrderStatus from, OrderStatus to, String reason, User user) {
        OrderStatusLog statusLog = OrderStatusLog.builder()
                .order(order)
                .fromStatus(from)
                .toStatus(to)
                .reason(reason)
                .changedBy(user)
                .build();
        orderStatusLogRepository.save(statusLog);
    }

    public OrderResponse mapToResponse(Order order) {
        List<OrderItemResponse> itemResponses = order.getItems().stream()
                .map(i -> OrderItemResponse.builder()
                        .id(i.getId())
                        .variantId(i.getVariant() != null ? i.getVariant().getId() : null)
                        .serviceId(i.getService() != null ? i.getService().getId() : null)
                        .itemType(i.getItemType())
                        .itemName(i.getItemName())
                        .sku(i.getSku())
                        .qty(i.getQty())
                        .unitPrice(i.getUnitPrice())
                        .unitDiscount(i.getUnitDiscount())
                        .unitTax(i.getUnitTax())
                        .totalPrice(i.getTotalPrice())
                        .build())
                .collect(Collectors.toList());

        List<OrderStatusLogDto> statusLogs = orderStatusLogRepository.findByOrderIdOrderByCreatedAtAsc(order.getId()).stream()
                .map(l -> OrderStatusLogDto.builder()
                        .fromStatus(l.getFromStatus())
                        .toStatus(l.getToStatus())
                        .reason(l.getReason())
                        .changedByName(l.getChangedBy() != null ? l.getChangedBy().getFullName() : "System")
                        .createdAt(l.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        return OrderResponse.builder()
                .id(order.getId())
                .orderNo(order.getOrderNo())
                .memberId(order.getMember() != null ? order.getMember().getId() : null)
                .customerName(order.getGuestName() != null ? order.getGuestName() : (order.getMember() != null ? order.getMember().getFullName() : "Guest"))
                .guestPhone(order.getGuestPhone())
                .guestEmail(order.getGuestEmail())
                .channel(order.getChannel())
                .fulfilmentType(order.getFulfilmentType())
                .status(order.getStatus())
                .subtotal(order.getSubtotal())
                .discount(order.getDiscount())
                .tax(order.getTax())
                .deliveryFee(order.getDeliveryFee())
                .total(order.getTotal())
                .pickupCode(order.getPickupCode())
                .deliveryAddress(order.getDeliveryAddress())
                .deliveryCity(order.getDeliveryCity())
                .deliveryPincode(order.getDeliveryPincode())
                .deliveryNotes(order.getDeliveryNotes())
                .paymentMethod(order.getPaymentMethod())
                .paymentReference(order.getPaymentReference())
                .paidAt(order.getPaidAt())
                .placedAt(order.getPlacedAt())
                .packedAt(order.getPackedAt())
                .readyAt(order.getReadyAt())
                .outForDeliveryAt(order.getOutForDeliveryAt())
                .completedAt(order.getCompletedAt())
                .cancelledAt(order.getCancelledAt())
                .cancellationReason(order.getCancellationReason())
                .refundReference(order.getRefundReference())
                .refundAmount(order.getRefundAmount())
                .refundedAt(order.getRefundedAt())
                .version(order.getVersion())
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .items(itemResponses)
                .statusLogs(statusLogs)
                .build();
    }

    public CartResponse mapToCartResponse(Order cart) {
        boolean hasStockWarnings = false;
        boolean hasPriceDiffs = false;
        int totalItemCount = 0;

        List<CartItemDto> items = new ArrayList<>();
        for (OrderItem item : cart.getItems()) {
            totalItemCount += item.getQty();
            int availableStock = 999;
            boolean isOutOfStock = false;
            boolean isLowStock = false;
            BigDecimal currentPrice = item.getUnitPrice();
            boolean priceChanged = false;

            if (item.getVariant() != null) {
                Inventory inv = inventoryRepository.findByVariantId(item.getVariant().getId()).orElse(null);
                availableStock = inv != null ? inv.getAvailable() : 0;
                isOutOfStock = availableStock <= 0;
                isLowStock = availableStock > 0 && availableStock <= (item.getVariant().getReorderLevel() != null ? item.getVariant().getReorderLevel() : 5);

                if (availableStock < item.getQty()) {
                    hasStockWarnings = true;
                }

                BigDecimal activePrice = item.getVariant().getEffectivePrice();
                if (activePrice.compareTo(item.getUnitPrice()) != 0) {
                    priceChanged = true;
                    hasPriceDiffs = true;
                    currentPrice = activePrice;
                }
            }

            items.add(CartItemDto.builder()
                    .id(item.getId())
                    .variantId(item.getVariant() != null ? item.getVariant().getId() : null)
                    .serviceId(item.getService() != null ? item.getService().getId() : null)
                    .itemType(item.getItemType())
                    .itemName(item.getItemName())
                    .sku(item.getSku())
                    .size(item.getVariant() != null ? item.getVariant().getSize() : null)
                    .color(item.getVariant() != null ? item.getVariant().getColor() : null)
                    .qty(item.getQty())
                    .unitPrice(item.getUnitPrice())
                    .unitDiscount(item.getUnitDiscount())
                    .unitTax(item.getUnitTax())
                    .totalPrice(item.getTotalPrice())
                    .availableStock(availableStock)
                    .isOutOfStock(isOutOfStock)
                    .isLowStock(isLowStock)
                    .currentPrice(currentPrice)
                    .priceChanged(priceChanged)
                    .build());
        }

        return CartResponse.builder()
                .orderId(cart.getId())
                .orderNo(cart.getOrderNo())
                .items(items)
                .subtotal(cart.getSubtotal())
                .discount(cart.getDiscount())
                .tax(cart.getTax())
                .estimatedTotal(cart.getTotal())
                .hasStockWarnings(hasStockWarnings)
                .hasPriceDiffs(hasPriceDiffs)
                .totalItemCount(totalItemCount)
                .build();
    }
}
