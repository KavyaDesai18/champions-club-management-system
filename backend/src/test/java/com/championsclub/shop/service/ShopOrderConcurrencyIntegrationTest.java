package com.championsclub.shop.service;

import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.member.domain.Member;
import com.championsclub.member.domain.MemberStatus;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.MemberRepository;
import com.championsclub.notification.service.NotificationDispatcher;
import com.championsclub.shop.domain.*;
import com.championsclub.shop.dto.*;
import com.championsclub.shop.exception.IllegalOrderStateTransitionException;
import com.championsclub.shop.exception.InsufficientStockException;
import com.championsclub.shop.repo.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.dao.OptimisticLockingFailureException;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class ShopOrderConcurrencyIntegrationTest {

    @Mock private OrderRepository orderRepository;
    @Mock private OrderItemRepository orderItemRepository;
    @Mock private OrderStatusLogRepository orderStatusLogRepository;
    @Mock private ProductVariantRepository variantRepository;
    @Mock private ClubServiceRepository clubServiceRepository;
    @Mock private MemberRepository memberRepository;
    @Mock private InventoryRepository inventoryRepository;
    @Mock private StockMovementRepository stockMovementRepository;
    @Mock private LowStockAlertRepository lowStockAlertRepository;
    @Mock private PricingQuoteService pricingQuoteService;
    @Mock private ShopSseHub shopSseHub;
    @Mock private NotificationDispatcher notificationDispatcher;

    private InventoryService inventoryService;
    private ShopOrderService shopOrderService;

    private Product testProduct;
    private ProductVariant testVariant;
    private Member activeMember;
    private Member suspendedMember;
    private User staffUser;

    // Concurrency state
    private final AtomicInteger onHand = new AtomicInteger(1);
    private final AtomicInteger reserved = new AtomicInteger(0);
    private final List<StockMovement> ledger = Collections.synchronizedList(new ArrayList<>());
    private final ReentrantLock dbLock = new ReentrantLock();

    @BeforeEach
    void setUp() {
        inventoryService = new InventoryService(
                inventoryRepository,
                stockMovementRepository,
                variantRepository,
                lowStockAlertRepository,
                shopSseHub
        );

        shopOrderService = new ShopOrderService(
                orderRepository,
                orderItemRepository,
                orderStatusLogRepository,
                variantRepository,
                clubServiceRepository,
                memberRepository,
                inventoryRepository,
                inventoryService,
                pricingQuoteService,
                shopSseHub,
                notificationDispatcher
        );

        // Reset state
        onHand.set(1);
        reserved.set(0);
        ledger.clear();

        // Seed initial restock movement so ledger sum equals onHand
        ledger.add(StockMovement.builder()
                .type(StockMovementType.PURCHASE)
                .qty(1)
                .build());

        testProduct = Product.builder()
                .id(UUID.randomUUID())
                .name("Wilson Pro Staff 97 v14")
                .sku("WIL-PS97-V14")
                .basePrice(new BigDecimal("279.00"))
                .taxCategory("STANDARD")
                .active(true)
                .build();

        testVariant = ProductVariant.builder()
                .id(UUID.randomUUID())
                .product(testProduct)
                .sku("VAR-PS97-G2")
                .size("G2")
                .priceOverride(new BigDecimal("279.00"))
                .reorderLevel(5)
                .reorderQty(10)
                .build();

        activeMember = Member.builder()
                .id(UUID.randomUUID())
                .fullName("Alex Rodriguez")
                .email("alex@championsclub.com")
                .status(MemberStatus.ACTIVE)
                .build();

        suspendedMember = Member.builder()
                .id(UUID.randomUUID())
                .fullName("Suspended Player")
                .email("suspended@championsclub.com")
                .status(MemberStatus.SUSPENDED)
                .build();

        staffUser = User.builder()
                .id(UUID.randomUUID())
                .fullName("Marcus Staff")
                .email("staff@championsclub.com")
                .build();

        // Wire Mocks
        when(variantRepository.findById(testVariant.getId())).thenReturn(Optional.of(testVariant));
        when(variantRepository.findByIdAndIsDeletedFalse(testVariant.getId())).thenReturn(Optional.of(testVariant));
        when(memberRepository.findById(activeMember.getId())).thenReturn(Optional.of(activeMember));
        when(memberRepository.findById(suspendedMember.getId())).thenReturn(Optional.of(suspendedMember));

        // Atomic SQL Simulation for InventoryRepository
        when(inventoryRepository.atomicDeductOnHand(eq(testVariant.getId()), anyInt()))
                .thenAnswer(inv -> {
                    dbLock.lock();
                    try {
                        int qty = inv.getArgument(1);
                        if (onHand.get() - reserved.get() >= qty) {
                            onHand.addAndGet(-qty);
                            return 1;
                        }
                        return 0;
                    } finally {
                        dbLock.unlock();
                    }
                });

        when(inventoryRepository.atomicReserve(eq(testVariant.getId()), anyInt()))
                .thenAnswer(inv -> {
                    dbLock.lock();
                    try {
                        int qty = inv.getArgument(1);
                        if (onHand.get() - reserved.get() >= qty) {
                            reserved.addAndGet(qty);
                            return 1;
                        }
                        return 0;
                    } finally {
                        dbLock.unlock();
                    }
                });

        when(inventoryRepository.atomicRelease(eq(testVariant.getId()), anyInt()))
                .thenAnswer(inv -> {
                    dbLock.lock();
                    try {
                        int qty = inv.getArgument(1);
                        if (reserved.get() >= qty) {
                            reserved.addAndGet(-qty);
                            return 1;
                        }
                        return 0;
                    } finally {
                        dbLock.unlock();
                    }
                });

        when(inventoryRepository.atomicFulfillReservedSale(eq(testVariant.getId()), anyInt()))
                .thenAnswer(inv -> {
                    dbLock.lock();
                    try {
                        int qty = inv.getArgument(1);
                        if (reserved.get() >= qty && onHand.get() >= qty) {
                            reserved.addAndGet(-qty);
                            onHand.addAndGet(-qty);
                            return 1;
                        }
                        return 0;
                    } finally {
                        dbLock.unlock();
                    }
                });

        when(inventoryRepository.findByVariantId(testVariant.getId()))
                .thenAnswer(inv -> Optional.of(Inventory.builder()
                        .variant(testVariant)
                        .variantId(testVariant.getId())
                        .onHand(onHand.get())
                        .reserved(reserved.get())
                        .build()));

        when(stockMovementRepository.save(any(StockMovement.class)))
                .thenAnswer(inv -> {
                    StockMovement m = inv.getArgument(0);
                    ledger.add(m);
                    return m;
                });

        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        when(pricingQuoteService.calculateQuote(any(PriceQuoteRequest.class)))
                .thenReturn(PriceQuoteResponse.builder()
                        .unitBasePrice(new BigDecimal("279.00"))
                        .unitDiscount(BigDecimal.ZERO)
                        .unitTax(new BigDecimal("27.90"))
                        .unitFinalPrice(new BigDecimal("306.90"))
                        .totalFinalPrice(new BigDecimal("306.90"))
                        .build());
    }

    @Test
    @DisplayName("Oversell Concurrency Race: 10 threads (5 counter POS + 5 online checkout) compete for last 1 unit -> Exactly 1 succeeds, 9 fail")
    void testConcurrentOversellCounterVsOnline() throws InterruptedException {
        int threadCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            final boolean isCounterSale = (i % 2 == 0);
            executor.submit(() -> {
                try {
                    startLatch.await();
                    if (isCounterSale) {
                        // Staff Counter POS Quick Sale
                        CounterOrderCreateRequest req = CounterOrderCreateRequest.builder()
                                .items(List.of(CartItemRequest.builder().variantId(testVariant.getId()).qty(1).build()))
                                .paymentMethod("CASH")
                                .build();
                        shopOrderService.createCounterSale(req, staffUser);
                    } else {
                        // Online Member Checkout
                        Order memberCart = Order.builder()
                                .id(UUID.randomUUID())
                                .orderNo("ORD-" + UUID.randomUUID().toString().substring(0, 8))
                                .member(activeMember)
                                .channel(OrderChannel.ONLINE)
                                .fulfilmentType(OrderFulfilmentType.PICKUP)
                                .status(OrderStatus.CART)
                                .subtotal(new BigDecimal("279.00"))
                                .total(new BigDecimal("306.90"))
                                .build();
                        memberCart.addItem(OrderItem.builder()
                                .variant(testVariant)
                                .qty(1)
                                .unitPrice(new BigDecimal("279.00"))
                                .totalPrice(new BigDecimal("306.90"))
                                .build());

                        when(orderRepository.findByMemberIdAndStatus(activeMember.getId(), OrderStatus.CART))
                                .thenReturn(Optional.of(memberCart));

                        CheckoutRequest checkoutReq = CheckoutRequest.builder()
                                .fulfilmentType(OrderFulfilmentType.PICKUP)
                                .paymentMethod("WALLET")
                                .build();
                        shopOrderService.placeOrder(activeMember.getId(), checkoutReq, staffUser);
                    }
                    successCount.incrementAndGet();
                } catch (InsufficientStockException e) {
                    failureCount.incrementAndGet();
                } catch (Exception e) {
                    // unexpected error
                    e.printStackTrace();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        // Fire all 10 threads simultaneously
        startLatch.countDown();
        boolean completed = doneLatch.await(5, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(completed).isTrue();
        assertThat(successCount.get())
                .as("Exactly 1 concurrent request must win the last unit")
                .isEqualTo(1);
        assertThat(failureCount.get())
                .as("Exactly 9 concurrent requests must be rejected with InsufficientStockException")
                .isEqualTo(9);

        // Assert Available = 0
        int available = onHand.get() - reserved.get();
        assertThat(available).isEqualTo(0);

        // Ledger sum invariant holds
        int ledgerSum = ledger.stream().mapToInt(StockMovement::getQty).sum();
        assertThat(ledgerSum).isEqualTo(onHand.get());
    }

    @Test
    @DisplayName("Reserve / Release / Payment Invariants: Online order full lifecycle maintains SUM(ledger) == onHand")
    void testOnlineOrderReservationAndFulfillmentLifecycle() {
        onHand.set(5);
        reserved.set(0);
        ledger.clear();
        ledger.add(StockMovement.builder().type(StockMovementType.PURCHASE).qty(5).build());

        Order cart = Order.builder()
                .id(UUID.randomUUID())
                .orderNo("ORD-TEST-001")
                .member(activeMember)
                .channel(OrderChannel.ONLINE)
                .fulfilmentType(OrderFulfilmentType.PICKUP)
                .status(OrderStatus.CART)
                .subtotal(new BigDecimal("279.00"))
                .total(new BigDecimal("306.90"))
                .build();
        cart.addItem(OrderItem.builder()
                .variant(testVariant)
                .qty(2)
                .unitPrice(new BigDecimal("279.00"))
                .totalPrice(new BigDecimal("558.00"))
                .build());

        when(orderRepository.findByMemberIdAndStatus(activeMember.getId(), OrderStatus.CART))
                .thenReturn(Optional.of(cart));

        // 1. Place order -> Reserves 2 units
        CheckoutRequest checkoutReq = CheckoutRequest.builder()
                .fulfilmentType(OrderFulfilmentType.PICKUP)
                .paymentMethod("WALLET")
                .build();
        OrderResponse placed = shopOrderService.placeOrder(activeMember.getId(), checkoutReq, staffUser);

        assertThat(placed.getStatus()).isEqualTo(OrderStatus.PLACED);
        assertThat(reserved.get()).isEqualTo(2);
        assertThat(onHand.get()).isEqualTo(5);
        assertThat(onHand.get() - reserved.get()).isEqualTo(3); // available is 3
        assertThat(ledger.stream().mapToInt(StockMovement::getQty).sum()).isEqualTo(onHand.get());

        // 2. Pay order -> Converts reserved to sale
        when(orderRepository.findById(placed.getId())).thenReturn(Optional.of(cart));
        OrderResponse paid = shopOrderService.payOrder(placed.getId(), "WALLET", "TXN-123", staffUser);

        assertThat(paid.getStatus()).isEqualTo(OrderStatus.PAID);
        assertThat(reserved.get()).isEqualTo(0);
        assertThat(onHand.get()).isEqualTo(3); // on_hand decreased by 2
        assertThat(ledger.stream().mapToInt(StockMovement::getQty).sum()).isEqualTo(onHand.get());
    }

    @Test
    @DisplayName("Payment Timeout (15 min): Auto-release job restores reserved stock and cancels order")
    void testPaymentTimeoutReleasesReservedStock() {
        onHand.set(3);
        reserved.set(2);

        Order expiredOrder = Order.builder()
                .id(UUID.randomUUID())
                .orderNo("ORD-EXPIRED-01")
                .member(activeMember)
                .status(OrderStatus.PLACED)
                .placedAt(Instant.now().minus(20, ChronoUnit.MINUTES))
                .build();
        expiredOrder.addItem(OrderItem.builder()
                .variant(testVariant)
                .qty(2)
                .unitPrice(new BigDecimal("279.00"))
                .totalPrice(new BigDecimal("558.00"))
                .build());

        Instant cutoff = Instant.now().minus(15, ChronoUnit.MINUTES);
        when(orderRepository.findByStatusAndPlacedAtBefore(OrderStatus.PLACED, cutoff))
                .thenReturn(List.of(expiredOrder));

        int expired = shopOrderService.expirePlacedOrders(cutoff);

        assertThat(expired).isEqualTo(1);
        assertThat(reserved.get()).isEqualTo(0); // Reservation released!
        assertThat(expiredOrder.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(expiredOrder.getCancellationReason()).contains("15 min elapsed");
    }

    @Test
    @DisplayName("Idempotency: Submitting duplicate order request with same idempotency key returns cached order")
    void testIdempotencyReturnsExistingOrder() {
        String key = "IDEMP-KEY-999";
        Order existing = Order.builder()
                .id(UUID.randomUUID())
                .orderNo("ORD-IDEMP-01")
                .idempotencyKey(key)
                .status(OrderStatus.PLACED)
                .subtotal(new BigDecimal("279.00"))
                .total(new BigDecimal("306.90"))
                .build();

        when(orderRepository.findByIdempotencyKey(key)).thenReturn(Optional.of(existing));

        CheckoutRequest req = CheckoutRequest.builder()
                .idempotencyKey(key)
                .fulfilmentType(OrderFulfilmentType.PICKUP)
                .build();

        OrderResponse res = shopOrderService.placeOrder(activeMember.getId(), req, staffUser);

        assertThat(res.getOrderNo()).isEqualTo("ORD-IDEMP-01");
        verify(inventoryRepository, never()).atomicReserve(any(), anyInt());
    }

    @Test
    @DisplayName("Suspended Member Guard: Suspended members cannot checkout shop orders")
    void testSuspendedMemberCannotCheckout() {
        CheckoutRequest req = CheckoutRequest.builder()
                .fulfilmentType(OrderFulfilmentType.PICKUP)
                .build();

        assertThatThrownBy(() -> shopOrderService.placeOrder(suspendedMember.getId(), req, staffUser))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("suspended");
    }

    @Test
    @DisplayName("Optimistic Locking Conflict: Two staff updating order concurrently throws OptimisticLockingFailureException")
    void testOptimisticLockingConflict() {
        Order order = Order.builder()
                .id(UUID.randomUUID())
                .orderNo("ORD-CONCUR-01")
                .status(OrderStatus.PAID)
                .version(1L)
                .build();

        when(orderRepository.findById(order.getId())).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenThrow(new OptimisticLockingFailureException("Row updated by another transaction"));

        assertThatThrownBy(() -> shopOrderService.updateOrderStatus(order.getId(), OrderStatus.PACKED, "Packing order", staffUser))
                .isInstanceOf(OptimisticLockingFailureException.class);
    }

    @Test
    @DisplayName("Delivery Minimum Order & Pincode Guard: Invalid pincode and subtotal < $20 are rejected")
    void testDeliveryValidationGuards() {
        Order cart = Order.builder()
                .id(UUID.randomUUID())
                .orderNo("ORD-DELIVERY-TEST")
                .member(activeMember)
                .status(OrderStatus.CART)
                .subtotal(new BigDecimal("15.00")) // < $20
                .build();
        cart.addItem(OrderItem.builder()
                .variant(testVariant)
                .qty(1)
                .unitPrice(new BigDecimal("15.00"))
                .totalPrice(new BigDecimal("15.00"))
                .build());

        when(orderRepository.findByMemberIdAndStatus(activeMember.getId(), OrderStatus.CART))
                .thenReturn(Optional.of(cart));

        // 1. Invalid Pincode
        CheckoutRequest invalidPincode = CheckoutRequest.builder()
                .fulfilmentType(OrderFulfilmentType.DELIVERY)
                .deliveryAddress("123 Club Street")
                .deliveryCity("Bangalore")
                .deliveryPincode("INVALID")
                .build();

        assertThatThrownBy(() -> shopOrderService.placeOrder(activeMember.getId(), invalidPincode, staffUser))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("postal code");

        // 2. Subtotal under $20
        CheckoutRequest underMinOrder = CheckoutRequest.builder()
                .fulfilmentType(OrderFulfilmentType.DELIVERY)
                .deliveryAddress("123 Club Street")
                .deliveryCity("Bangalore")
                .deliveryPincode("560001")
                .build();

        assertThatThrownBy(() -> shopOrderService.placeOrder(activeMember.getId(), underMinOrder, staffUser))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("$20.00");
    }
}
