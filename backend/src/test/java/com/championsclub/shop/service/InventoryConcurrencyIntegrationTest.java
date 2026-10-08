package com.championsclub.shop.service;

import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.member.domain.User;
import com.championsclub.shop.domain.*;
import com.championsclub.shop.dto.QuickSaleRequest;
import com.championsclub.shop.dto.QuickSaleResponse;
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

import java.math.BigDecimal;
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
public class InventoryConcurrencyIntegrationTest {

    @Mock private InventoryRepository inventoryRepository;
    @Mock private StockMovementRepository stockMovementRepository;
    @Mock private ProductVariantRepository variantRepository;
    @Mock private LowStockAlertRepository lowStockAlertRepository;
    @Mock private ShopSseHub shopSseHub;

    private InventoryService inventoryService;

    private Product testProduct;
    private ProductVariant testVariant;
    private Inventory testInventory;
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

        testProduct = Product.builder()
                .id(UUID.randomUUID())
                .sku("PRD-ASTROX99")
                .name("Yonex Astrox 99 Pro")
                .brand("Yonex")
                .basePrice(new BigDecimal("249.99"))
                .taxCategory("STANDARD")
                .active(true)
                .isDeleted(false)
                .build();

        testVariant = ProductVariant.builder()
                .id(UUID.randomUUID())
                .product(testProduct)
                .sku("VAR-ASTROX99-4U")
                .size("4U/G5")
                .color("White/Tiger")
                .barcode("890123456001")
                .costPrice(new BigDecimal("160.00"))
                .reorderLevel(3)
                .reorderQty(10)
                .isDeleted(false)
                .build();

        testInventory = Inventory.builder()
                .variantId(testVariant.getId())
                .variant(testVariant)
                .onHand(1)
                .reserved(0)
                .version(1L)
                .build();

        ledger.clear();

        when(variantRepository.findByIdAndIsDeletedFalse(testVariant.getId())).thenReturn(Optional.of(testVariant));
        when(inventoryRepository.findByVariantId(testVariant.getId())).thenAnswer(inv -> Optional.of(testInventory));

        // Mock append-only ledger saving and calculation
        when(stockMovementRepository.save(any(StockMovement.class))).thenAnswer(invocation -> {
            StockMovement sm = invocation.getArgument(0);
            ledger.add(sm);
            return sm;
        });

        when(stockMovementRepository.sumQtyByVariantId(testVariant.getId())).thenAnswer(inv ->
                ledger.stream().mapToInt(StockMovement::getQty).sum()
        );

        // Atomic DB SQL simulation with lock (mirrors PostgreSQL atomic UPDATE ... WHERE on_hand - reserved >= :qty)
        when(inventoryRepository.atomicDeductOnHand(eq(testVariant.getId()), anyInt())).thenAnswer(invocation -> {
            int qty = invocation.getArgument(1);
            dbLock.lock();
            try {
                if ((testInventory.getOnHand() - testInventory.getReserved()) >= qty) {
                    testInventory.setOnHand(testInventory.getOnHand() - qty);
                    return 1;
                }
                return 0; // Atomic update failed
            } finally {
                dbLock.unlock();
            }
        });

        when(inventoryRepository.atomicReserve(eq(testVariant.getId()), anyInt())).thenAnswer(invocation -> {
            int qty = invocation.getArgument(1);
            dbLock.lock();
            try {
                if ((testInventory.getOnHand() - testInventory.getReserved()) >= qty) {
                    testInventory.setReserved(testInventory.getReserved() + qty);
                    return 1;
                }
                return 0;
            } finally {
                dbLock.unlock();
            }
        });

        when(inventoryRepository.atomicRelease(eq(testVariant.getId()), anyInt())).thenAnswer(invocation -> {
            int qty = invocation.getArgument(1);
            dbLock.lock();
            try {
                if (testInventory.getReserved() >= qty) {
                    testInventory.setReserved(testInventory.getReserved() - qty);
                    return 1;
                }
                return 0;
            } finally {
                dbLock.unlock();
            }
        });

        when(inventoryRepository.atomicFulfillReservedSale(eq(testVariant.getId()), anyInt())).thenAnswer(invocation -> {
            int qty = invocation.getArgument(1);
            dbLock.lock();
            try {
                if (testInventory.getReserved() >= qty && testInventory.getOnHand() >= qty) {
                    testInventory.setOnHand(testInventory.getOnHand() - qty);
                    testInventory.setReserved(testInventory.getReserved() - qty);
                    return 1;
                }
                return 0;
            } finally {
                dbLock.unlock();
            }
        });

        when(inventoryRepository.atomicAddOnHand(eq(testVariant.getId()), anyInt())).thenAnswer(invocation -> {
            int qty = invocation.getArgument(1);
            dbLock.lock();
            try {
                testInventory.setOnHand(testInventory.getOnHand() + qty);
                return 1;
            } finally {
                dbLock.unlock();
            }
        });

        when(inventoryRepository.atomicReconcileOnHand(eq(testVariant.getId()), anyInt())).thenAnswer(invocation -> {
            int newOnHand = invocation.getArgument(1);
            dbLock.lock();
            try {
                if (newOnHand >= testInventory.getReserved()) {
                    testInventory.setOnHand(newOnHand);
                    return 1;
                }
                return 0;
            } finally {
                dbLock.unlock();
            }
        });
    }

    @Test
    @DisplayName("Concurrency Oversell Test: 10 threads concurrently buying last 1 item gives EXACTLY 1 success, 9 failures")
    void testConcurrentOversellPrevention() throws InterruptedException {
        // Setup initial inventory: onHand = 1, reserved = 0
        testInventory.setOnHand(1);
        testInventory.setReserved(0);

        int threadCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            final String ref = "ORDER-CONC-" + i;
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await(); // Wait for all threads to be ready for simultaneous race
                    inventoryService.deductStockForSale(testVariant.getId(), 1, ref, "Concurrent race sale", null);
                    successCount.incrementAndGet();
                } catch (InsufficientStockException e) {
                    failureCount.incrementAndGet();
                } catch (Exception e) {
                    // unexpected
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        readyLatch.await(5, TimeUnit.SECONDS);
        startLatch.countDown(); // Fire all 10 threads at the exact same instant
        doneLatch.await(5, TimeUnit.SECONDS);
        executor.shutdown();

        // Assert strictly: exactly 1 sale succeeded, exactly 9 failed due to InsufficientStockException!
        assertThat(successCount.get()).isEqualTo(1);
        assertThat(failureCount.get()).isEqualTo(9);

        // Final inventory state must be exactly 0 on_hand, 0 reserved, 0 available! Overselling was impossible!
        assertThat(testInventory.getOnHand()).isEqualTo(0);
        assertThat(testInventory.getReserved()).isEqualTo(0);
        assertThat(testInventory.getAvailable()).isEqualTo(0);
    }

    @Test
    @DisplayName("Ledger Invariant Assertion: SUM(stock_movements.qty) == inventory.on_hand across full lifecycle")
    void testLedgerSumsEqualOnHandInvariant() {
        testInventory.setOnHand(0);
        testInventory.setReserved(0);
        ledger.clear();

        // 1. Initial restock +100 units
        inventoryService.restock(testVariant.getId(), 100, new BigDecimal("160.00"), "PO-INIT", "Restock 100 units", null);
        assertThat(testInventory.getOnHand()).isEqualTo(100);
        assertThat(inventoryService.assertLedgerInvariant(testVariant.getId())).isTrue();

        // 2. Direct sale -15 units (movement qty = -15)
        inventoryService.deductStockForSale(testVariant.getId(), 15, "SALE-01", "Counter checkout", null);
        assertThat(testInventory.getOnHand()).isEqualTo(85);
        assertThat(inventoryService.assertLedgerInvariant(testVariant.getId())).isTrue();

        // 3. Reserve 10 units (movement qty = 0, onHand remains 85, reserved becomes 10)
        inventoryService.reserveStock(testVariant.getId(), 10, "HOLD-01", "Online cart hold", null);
        assertThat(testInventory.getOnHand()).isEqualTo(85);
        assertThat(testInventory.getReserved()).isEqualTo(10);
        assertThat(testInventory.getAvailable()).isEqualTo(75);
        assertThat(inventoryService.assertLedgerInvariant(testVariant.getId())).isTrue();

        // 4. Release 4 reserved units (movement qty = 0, reserved becomes 6)
        inventoryService.releaseReservedStock(testVariant.getId(), 4, "HOLD-01", "Cart expiration", null);
        assertThat(testInventory.getOnHand()).isEqualTo(85);
        assertThat(testInventory.getReserved()).isEqualTo(6);
        assertThat(testInventory.getAvailable()).isEqualTo(79);
        assertThat(inventoryService.assertLedgerInvariant(testVariant.getId())).isTrue();

        // 5. Fulfill remaining 6 reserved units as completed sale (movement qty = -6, onHand becomes 79, reserved becomes 0)
        inventoryService.fulfillReservedSale(testVariant.getId(), 6, "ORDER-01", "Order collected", null);
        assertThat(testInventory.getOnHand()).isEqualTo(79);
        assertThat(testInventory.getReserved()).isEqualTo(0);
        assertThat(inventoryService.assertLedgerInvariant(testVariant.getId())).isTrue();

        // 6. Customer return +2 units (movement qty = +2, onHand becomes 81)
        inventoryService.returnItem(testVariant.getId(), 2, "RET-01", "Customer exchange return", null);
        assertThat(testInventory.getOnHand()).isEqualTo(81);
        assertThat(inventoryService.assertLedgerInvariant(testVariant.getId())).isTrue();

        // 7. Stock audit adjustment: physical count is 77 (delta = -4, movement qty = -4, onHand becomes 77)
        inventoryService.adjustStock(testVariant.getId(), 77, "Damaged in store display", "AUDIT-01", null);
        assertThat(testInventory.getOnHand()).isEqualTo(77);
        assertThat(inventoryService.assertLedgerInvariant(testVariant.getId())).isTrue();

        // Final verification: Ledger sum is exactly 77, matching inventory.on_hand
        int totalLedgerSum = inventoryService.getLedgerSum(testVariant.getId());
        assertThat(totalLedgerSum).isEqualTo(77);
        assertThat(testInventory.getOnHand()).isEqualTo(77);
    }

    @Test
    @DisplayName("Edge Case: Negative physical stock count attempt is rejected")
    void testNegativeStockAdjustmentRejected() {
        assertThatThrownBy(() -> inventoryService.adjustStock(testVariant.getId(), -5, "Audit error", "AUDIT", null))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Physical stock count cannot be negative");
    }

    @Test
    @DisplayName("Edge Case: Adjusting to identical count is rejected with zero-delta exception")
    void testAdjustToSameNumberRejected() {
        testInventory.setOnHand(10);
        assertThatThrownBy(() -> inventoryService.adjustStock(testVariant.getId(), 10, "No change", "AUDIT", null))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("identical to current on_hand quantity");
    }

    @Test
    @DisplayName("Edge Case: Restock quantity 0 or negative is rejected")
    void testRestockZeroOrNegativeRejected() {
        assertThatThrownBy(() -> inventoryService.restock(testVariant.getId(), 0, BigDecimal.TEN, "PO", "Restock", null))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Restock quantity must be positive");

        assertThatThrownBy(() -> inventoryService.restock(testVariant.getId(), -10, BigDecimal.TEN, "PO", "Restock", null))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Restock quantity must be positive");
    }

    @Test
    @DisplayName("Edge Case: Mandatory adjustment reason enforced")
    void testMandatoryAdjustmentReasonEnforced() {
        assertThatThrownBy(() -> inventoryService.adjustStock(testVariant.getId(), 5, "   ", "AUDIT", null))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Stock adjustment reason is mandatory");
    }

    @Test
    @DisplayName("Edge Case: Cannot adjust physical count below currently reserved stock")
    void testAdjustBelowReservedStockRejected() {
        testInventory.setOnHand(10);
        testInventory.setReserved(4);

        assertThatThrownBy(() -> inventoryService.adjustStock(testVariant.getId(), 2, "Loss audit", "AUDIT", null))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("below currently reserved quantity");
    }
}
