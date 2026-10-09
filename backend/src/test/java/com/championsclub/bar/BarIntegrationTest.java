package com.championsclub.bar;

import com.championsclub.bar.domain.*;
import com.championsclub.bar.dto.*;
import com.championsclub.bar.repo.*;
import com.championsclub.bar.service.*;
import com.championsclub.billing.domain.LedgerAccount;
import com.championsclub.billing.domain.Payment;
import com.championsclub.billing.domain.PaymentMethod;
import com.championsclub.billing.domain.PaymentSourceType;
import com.championsclub.billing.domain.PaymentStatus;
import com.championsclub.billing.dto.PaymentResponse;
import com.championsclub.billing.repo.LedgerEntryRepository;
import com.championsclub.billing.repo.PaymentRepository;
import com.championsclub.billing.service.CashDrawerService;
import com.championsclub.billing.service.PaymentService;
import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.MemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class BarIntegrationTest {

    @Mock private TabRepository tabRepository;
    @Mock private TabItemRepository tabItemRepository;
    @Mock private TabSplitRepository tabSplitRepository;
    @Mock private BarTableRepository barTableRepository;
    @Mock private MenuItemRepository menuItemRepository;
    @Mock private KitchenTicketRepository kitchenTicketRepository;
    @Mock private KitchenTicketItemRepository kitchenTicketItemRepository;
    @Mock private ShiftRepository shiftRepository;
    @Mock private MemberRepository memberRepository;
    @Mock private ShiftService shiftService;
    @Mock private KitchenDisplayService kitchenDisplayService;
    @Mock private PaymentService paymentService;
    @Mock private CashDrawerService cashDrawerService;
    @Mock private LedgerEntryRepository ledgerEntryRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private JdbcTemplate jdbcTemplate;

    private TabService tabService;
    private ShiftService concreteShiftService;
    private BarTableService barTableService;

    private User waiterUser;
    private BarTable tableT1;
    private BarTable tableT2;
    private Shift activeShift;
    private MenuItem craftBeer;
    private MenuItem chickenBurger;

    @BeforeEach
    void setUp() {
        tabService = new TabService(
                tabRepository,
                tabItemRepository,
                barTableRepository,
                menuItemRepository,
                kitchenTicketRepository,
                kitchenTicketItemRepository,
                tabSplitRepository,
                memberRepository,
                shiftService,
                kitchenDisplayService,
                paymentService,
                jdbcTemplate
        );

        concreteShiftService = new ShiftService(
                shiftRepository,
                tabRepository,
                tabItemRepository,
                paymentRepository,
                ledgerEntryRepository,
                cashDrawerService
        );

        barTableService = new BarTableService(
                barTableRepository,
                tabRepository,
                kitchenTicketRepository
        );

        waiterUser = User.builder()
                .id(UUID.randomUUID())
                .email("waiter@championsclub.com")
                .fullName("John Waiter")
                .role(com.championsclub.common.security.Role.BAR_STAFF)
                .build();

        tableT1 = BarTable.builder()
                .id(UUID.randomUUID())
                .label("T1")
                .seats(4)
                .status(TableStatus.FREE)
                .isActive(true)
                .build();

        tableT2 = BarTable.builder()
                .id(UUID.randomUUID())
                .label("T2")
                .seats(2)
                .status(TableStatus.FREE)
                .isActive(true)
                .build();

        activeShift = Shift.builder()
                .id(UUID.randomUUID())
                .staffUser(waiterUser)
                .startTime(Instant.now().minus(2, ChronoUnit.HOURS))
                .status(ShiftStatus.OPEN)
                .openingCash(new BigDecimal("1000.00"))
                .cashCollected(BigDecimal.ZERO)
                .cashVariance(BigDecimal.ZERO)
                .station("BAR")
                .build();

        craftBeer = MenuItem.builder()
                .id(UUID.randomUUID())
                .name("Craft IPA")
                .price(new BigDecimal("350.00"))
                .taxCategory("GST_18")
                .prepStation(StationType.BAR)
                .isAlcoholic(true)
                .isAvailable(true)
                .build();

        chickenBurger = MenuItem.builder()
                .id(UUID.randomUUID())
                .name("Classic Chicken Burger")
                .price(new BigDecimal("280.00"))
                .taxCategory("GST_5")
                .prepStation(StationType.KITCHEN)
                .isAlcoholic(false)
                .isAvailable(true)
                .build();

        when(shiftService.requireActiveShift(any())).thenReturn(activeShift);
        when(shiftRepository.findById(activeShift.getId())).thenReturn(Optional.of(activeShift));
        when(barTableRepository.findById(tableT1.getId())).thenReturn(Optional.of(tableT1));
        when(barTableRepository.findById(tableT2.getId())).thenReturn(Optional.of(tableT2));
        when(menuItemRepository.findByIdAndIsDeletedFalse(craftBeer.getId())).thenReturn(Optional.of(craftBeer));
        when(menuItemRepository.findByIdAndIsDeletedFalse(chickenBurger.getId())).thenReturn(Optional.of(chickenBurger));
        when(jdbcTemplate.queryForObject(anyString(), eq(Long.class))).thenReturn(501L);

        when(paymentService.processPayment(any(), any(), any())).thenReturn(
                PaymentResponse.builder()
                        .status(PaymentStatus.SUCCEEDED)
                        .amount(new BigDecimal("294.00"))
                        .build()
        );
    }

    @Test
    @DisplayName("Concurrent tab edits detect optimistic lock version conflict")
    void testConcurrentTabEdits_OptimisticLockConflict() {
        Tab sharedTab = Tab.builder()
                .id(UUID.randomUUID())
                .tabNumber("TAB-500")
                .table(tableT1)
                .guestName("Alice & Bob")
                .status(TabStatus.OPEN)
                .version(2L) // Current version in DB is 2
                .subtotal(new BigDecimal("280.00"))
                .totalAmount(new BigDecimal("294.00"))
                .items(new ArrayList<>())
                .build();

        when(tabRepository.findById(sharedTab.getId())).thenReturn(Optional.of(sharedTab));

        // Waiter 1 arrives with stale version 1
        AddTabItemsRequest staleReq = AddTabItemsRequest.builder()
                .version(1L) // Stale version
                .items(List.of(AddTabItemDto.builder().menuItemId(craftBeer.getId()).qty(1).notes("Cold").build()))
                .build();

        assertThatThrownBy(() -> tabService.addItemsToTab(sharedTab.getId(), staleReq, waiterUser))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Tab was updated by another terminal/server");

        // Waiter 2 arrives with correct current version 2 -> succeeds
        when(tabItemRepository.save(any(TabItem.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(tabRepository.save(any(Tab.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(kitchenTicketRepository.save(any(KitchenTicket.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AddTabItemsRequest validReq = AddTabItemsRequest.builder()
                .version(2L)
                .items(List.of(AddTabItemDto.builder().menuItemId(chickenBurger.getId()).qty(1).build()))
                .build();

        TabDto updated = tabService.addItemsToTab(sharedTab.getId(), validReq, waiterUser);
        assertThat(updated).isNotNull();
        assertThat(sharedTab.getVersion()).isEqualTo(3L);
    }

    @Test
    @DisplayName("Stress test: 20 orders placed concurrently simulate thread synchronization")
    void test20ConcurrentOrdersAtOnce() throws Exception {
        int orderCount = 20;
        ExecutorService executor = Executors.newFixedThreadPool(10);
        CountDownLatch latch = new CountDownLatch(orderCount);
        AtomicInteger successCounter = new AtomicInteger(0);

        List<Tab> tabs = new ArrayList<>();
        for (int i = 0; i < orderCount; i++) {
            Tab t = Tab.builder()
                    .id(UUID.randomUUID())
                    .tabNumber("TAB-" + (1000 + i))
                    .table(tableT1)
                    .guestName("Guest " + i)
                    .status(TabStatus.OPEN)
                    .version(1L)
                    .items(new ArrayList<>())
                    .subtotal(BigDecimal.ZERO)
                    .totalAmount(BigDecimal.ZERO)
                    .build();
            tabs.add(t);
        }

        Map<UUID, Tab> tabMap = new ConcurrentHashMap<>();
        for (Tab t : tabs) {
            tabMap.put(t.getId(), t);
        }
        when(tabRepository.findById(any(UUID.class))).thenAnswer(inv -> {
            UUID id = inv.getArgument(0);
            return Optional.ofNullable(tabMap.get(id));
        });

        when(tabItemRepository.save(any(TabItem.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(tabRepository.save(any(Tab.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(kitchenTicketRepository.save(any(KitchenTicket.class))).thenAnswer(invocation -> invocation.getArgument(0));

        for (int i = 0; i < orderCount; i++) {
            final int index = i;
            executor.submit(() -> {
                try {
                    Tab currentTab = tabs.get(index);
                    AddTabItemsRequest req = AddTabItemsRequest.builder()
                            .version(1L)
                            .items(List.of(AddTabItemDto.builder().menuItemId(chickenBurger.getId()).qty(2).notes("Batch " + index).build()))
                            .build();

                    TabDto res = tabService.addItemsToTab(currentTab.getId(), req, waiterUser);
                    if (res != null) {
                        successCounter.incrementAndGet();
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                } finally {
                    latch.countDown();
                }
            });
        }

        boolean completed = latch.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(completed).isTrue();
        assertThat(successCounter.get()).isEqualTo(20);
    }

    @Test
    @DisplayName("Table occupancy transitions correctly between FREE and OCCUPIED, and atomic move")
    void testTableOccupancyAndAtomicMove() {
        assertThat(tableT1.getStatus()).isEqualTo(TableStatus.FREE);

        when(barTableRepository.save(any(BarTable.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(tabRepository.save(any(Tab.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateTabRequest openReq = CreateTabRequest.builder()
                .tableId(tableT1.getId())
                .guestName("Sarah Connors")
                .build();

        TabDto openedTab = tabService.createTab(openReq, waiterUser);
        assertThat(openedTab).isNotNull();
        assertThat(tableT1.getStatus()).isEqualTo(TableStatus.OCCUPIED);

        // Attempting to open another tab on T1 fails
        when(tabRepository.findFirstByTableIdAndStatus(tableT1.getId(), TabStatus.OPEN))
                .thenReturn(Optional.of(Tab.builder().tabNumber("TAB-501").build()));

        assertThatThrownBy(() -> tabService.createTab(openReq, waiterUser))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("already occupied");

        // Move tab from T1 to T2 using barTableService
        Tab tab = Tab.builder()
                .id(openedTab.getId())
                .tabNumber(openedTab.getTabNumber())
                .table(tableT1)
                .status(TabStatus.OPEN)
                .build();
        when(tabRepository.findById(tab.getId())).thenReturn(Optional.of(tab));

        barTableService.moveTabToTable(tab.getId(), tableT2.getId());

        assertThat(tableT1.getStatus()).isEqualTo(TableStatus.FREE);
        assertThat(tableT2.getStatus()).isEqualTo(TableStatus.OCCUPIED);
        assertThat(tab.getTable()).isEqualTo(tableT2);
    }

    @Test
    @DisplayName("Settle edge cases: 0 items rejected, settled twice rejected, open items auto-completed")
    void testSettleEdgeCases() {
        Tab tab = Tab.builder()
                .id(UUID.randomUUID())
                .tabNumber("TAB-700")
                .table(tableT1)
                .status(TabStatus.OPEN)
                .totalAmount(BigDecimal.ZERO)
                .paidAmount(BigDecimal.ZERO)
                .version(1L)
                .items(new ArrayList<>())
                .build();

        when(tabRepository.findById(tab.getId())).thenReturn(Optional.of(tab));

        // 1. Cannot settle tab with 0 items
        SettleTabRequest settleReq = SettleTabRequest.builder()
                .paymentMethod(PaymentMethod.CASH)
                .paidAmount(new BigDecimal("100.00"))
                .build();

        assertThatThrownBy(() -> tabService.settleTab(tab.getId(), settleReq, waiterUser, "IDEM-1"))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Cannot settle an empty tab");

        // 2. Add an item that is currently NEW
        TabItem item = TabItem.builder()
                .id(UUID.randomUUID())
                .tab(tab)
                .menuItem(chickenBurger)
                .itemName(chickenBurger.getName())
                .qty(1)
                .unitPrice(new BigDecimal("280.00"))
                .taxAmount(new BigDecimal("14.00"))
                .discountAmount(BigDecimal.ZERO)
                .lineTotal(new BigDecimal("294.00"))
                .status(TabItemStatus.NEW)
                .build();

        tab.getItems().add(item);
        tab.setSubtotal(new BigDecimal("280.00"));
        tab.setTaxAmount(new BigDecimal("14.00"));
        tab.setTotalAmount(new BigDecimal("294.00"));

        when(tabRepository.save(any(Tab.class))).thenAnswer(inv -> inv.getArgument(0));

        tabService.settleTab(tab.getId(), settleReq, waiterUser, "IDEM-2");

        assertThat(tab.getStatus()).isEqualTo(TabStatus.SETTLED);
        assertThat(item.getStatus()).isEqualTo(TabItemStatus.SERVED); // Auto-advanced to SERVED

        // 3. Cannot settle already settled tab
        assertThatThrownBy(() -> tabService.settleTab(tab.getId(), settleReq, waiterUser, "IDEM-3"))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("is already settled");
    }

    @Test
    @DisplayName("Daily Close report reconciles exactly with double-entry Ledger entries")
    void testDailyCloseReportAndLedgerReconciliation() {
        LocalDate today = LocalDate.now();

        Tab tab1 = Tab.builder()
                .id(UUID.randomUUID())
                .tabNumber("TAB-1")
                .status(TabStatus.SETTLED)
                .subtotal(new BigDecimal("1000.00"))
                .taxAmount(new BigDecimal("180.00"))
                .totalAmount(new BigDecimal("1180.00"))
                .items(new ArrayList<>())
                .build();

        Tab tab2 = Tab.builder()
                .id(UUID.randomUUID())
                .tabNumber("TAB-2")
                .status(TabStatus.SETTLED)
                .subtotal(new BigDecimal("2000.00"))
                .taxAmount(new BigDecimal("100.00"))
                .totalAmount(new BigDecimal("2100.00"))
                .items(new ArrayList<>())
                .build();

        TabItem item1 = TabItem.builder()
                .menuItem(craftBeer)
                .qty(1)
                .lineTotal(new BigDecimal("1180.00"))
                .status(TabItemStatus.SERVED)
                .build();
        tab1.getItems().add(item1);

        TabItem item2 = TabItem.builder()
                .menuItem(chickenBurger)
                .qty(1)
                .lineTotal(new BigDecimal("2100.00"))
                .status(TabItemStatus.SERVED)
                .build();
        tab2.getItems().add(item2);

        when(tabRepository.findAllByCreatedAtBetweenOrderByCreatedAtDesc(any(Instant.class), any(Instant.class)))
                .thenReturn(List.of(tab1, tab2));
        when(tabRepository.findAllByIsCarriedForwardTrueAndStatus(TabStatus.OPEN))
                .thenReturn(Collections.emptyList());

        Payment p1 = Payment.builder()
                .amount(new BigDecimal("1180.00"))
                .method(PaymentMethod.CASH)
                .status(PaymentStatus.SUCCEEDED)
                .build();
        Payment p2 = Payment.builder()
                .amount(new BigDecimal("2100.00"))
                .method(PaymentMethod.UPI)
                .status(PaymentStatus.SUCCEEDED)
                .build();

        when(paymentRepository.findBySourceTypeAndSourceId(PaymentSourceType.TAB, tab1.getId().toString()))
                .thenReturn(List.of(p1));
        when(paymentRepository.findBySourceTypeAndSourceId(PaymentSourceType.TAB, tab2.getId().toString()))
                .thenReturn(List.of(p2));

        when(ledgerEntryRepository.calculateAccountNetBalanceBetween(eq(LedgerAccount.BAR_REVENUE), any(Instant.class), any(Instant.class)))
                .thenReturn(new BigDecimal("3000.00"));
        when(ledgerEntryRepository.calculateAccountNetBalanceBetween(eq(LedgerAccount.TAX_PAYABLE), any(Instant.class), any(Instant.class)))
                .thenReturn(new BigDecimal("280.00"));

        when(shiftRepository.findAllByStartTimeBetweenOrderByStartTimeDesc(any(Instant.class), any(Instant.class)))
                .thenReturn(List.of(activeShift));

        DailyCloseReportDto report = concreteShiftService.generateDailyCloseReport(today);

        assertThat(report).isNotNull();
        assertThat(report.getTotalGrossRevenue()).isEqualByComparingTo(new BigDecimal("3000.00"));
        assertThat(report.getTotalTaxCollected()).isEqualByComparingTo(new BigDecimal("280.00"));
        assertThat(report.getRevenueByPaymentMethod()).containsEntry("CASH", new BigDecimal("1180.00"));
        assertThat(report.getRevenueByPaymentMethod()).containsEntry("UPI", new BigDecimal("2100.00"));
        assertThat(report.getLedgerReconciled()).isTrue();
    }

    @Test
    @DisplayName("Shift close computes cash count variance and carries forward open tabs")
    void testShiftCloseWithCashVarianceAndOpenTabs() {
        activeShift.setOpeningCash(new BigDecimal("1000.00"));
        activeShift.setCashCollected(new BigDecimal("2500.00"));

        when(shiftRepository.save(any(Shift.class))).thenAnswer(inv -> inv.getArgument(0));

        Tab openTab = Tab.builder()
                .id(UUID.randomUUID())
                .tabNumber("TAB-999")
                .shift(activeShift)
                .status(TabStatus.OPEN)
                .build();

        when(tabRepository.findOpenTabsInShift(activeShift.getId(), TabStatus.OPEN))
                .thenReturn(List.of(openTab));

        CloseShiftRequest closeReq = CloseShiftRequest.builder()
                .closingCash(new BigDecimal("3450.00"))
                .carryForwardOpenTabs(true)
                .carryForwardReason("Customer requested late bill settlement")
                .notes("Slight short by 50 rupees")
                .build();

        ShiftDto closed = concreteShiftService.closeShift(activeShift.getId(), closeReq, waiterUser);

        assertThat(closed).isNotNull();
        assertThat(closed.getStatus()).isEqualTo(ShiftStatus.CLOSED);
        assertThat(closed.getClosingCash()).isEqualByComparingTo(new BigDecimal("3450.00"));
        assertThat(closed.getCashVariance()).isEqualByComparingTo(new BigDecimal("-50.00"));
        assertThat(openTab.getIsCarriedForward()).isTrue();
        assertThat(openTab.getCarryForwardReason()).isEqualTo("Customer requested late bill settlement");
    }
}
