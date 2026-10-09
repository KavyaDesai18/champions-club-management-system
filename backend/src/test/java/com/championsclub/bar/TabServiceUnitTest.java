package com.championsclub.bar;

import com.championsclub.bar.domain.*;
import com.championsclub.bar.dto.*;
import com.championsclub.bar.repo.*;
import com.championsclub.bar.service.KitchenDisplayService;
import com.championsclub.bar.service.ShiftService;
import com.championsclub.bar.service.TabService;
import com.championsclub.billing.domain.PaymentMethod;
import com.championsclub.billing.service.PaymentService;
import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.member.domain.Member;
import com.championsclub.member.domain.Plan;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.MemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class TabServiceUnitTest {

    private TabRepository tabRepository;
    private TabItemRepository tabItemRepository;
    private BarTableRepository tableRepository;
    private MenuItemRepository menuItemRepository;
    private KitchenTicketRepository kitchenTicketRepository;
    private KitchenTicketItemRepository kitchenTicketItemRepository;
    private TabSplitRepository tabSplitRepository;
    private MemberRepository memberRepository;
    private ShiftService shiftService;
    private KitchenDisplayService kitchenDisplayService;
    private PaymentService paymentService;
    private JdbcTemplate jdbcTemplate;

    private TabService tabService;
    private User waiterUser;
    private Shift activeShift;

    @BeforeEach
    void setUp() {
        tabRepository = Mockito.mock(TabRepository.class);
        tabItemRepository = Mockito.mock(TabItemRepository.class);
        tableRepository = Mockito.mock(BarTableRepository.class);
        menuItemRepository = Mockito.mock(MenuItemRepository.class);
        kitchenTicketRepository = Mockito.mock(KitchenTicketRepository.class);
        kitchenTicketItemRepository = Mockito.mock(KitchenTicketItemRepository.class);
        tabSplitRepository = Mockito.mock(TabSplitRepository.class);
        memberRepository = Mockito.mock(MemberRepository.class);
        shiftService = Mockito.mock(ShiftService.class);
        kitchenDisplayService = Mockito.mock(KitchenDisplayService.class);
        paymentService = Mockito.mock(PaymentService.class);
        jdbcTemplate = Mockito.mock(JdbcTemplate.class);

        waiterUser = User.builder()
                .id(UUID.randomUUID())
                .fullName("Waiter John")
                .email("waiter@championsclub.com")
                .role(com.championsclub.common.security.Role.BAR_STAFF)
                .build();

        activeShift = Shift.builder()
                .id(UUID.randomUUID())
                .staffUser(waiterUser)
                .station("BAR")
                .status(ShiftStatus.OPEN)
                .build();

        when(shiftService.requireActiveShift(any())).thenReturn(activeShift);
        when(tabRepository.save(any(Tab.class))).thenAnswer(inv -> inv.getArgument(0));
        when(tabItemRepository.save(any(TabItem.class))).thenAnswer(inv -> inv.getArgument(0));
        when(kitchenTicketRepository.save(any(KitchenTicket.class))).thenAnswer(inv -> inv.getArgument(0));

        tabService = new TabService(
                tabRepository,
                tabItemRepository,
                tableRepository,
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
    }

    @Test
    @DisplayName("Age safeguard: Junior member cannot order alcoholic items")
    void testUnderageJuniorMemberAlcoholicRestriction() {
        UUID tabId = UUID.randomUUID();
        Plan juniorPlan = Plan.builder().code("JUNIOR").name("Junior Tier").build();
        Member juniorMember = Member.builder()
                .id(UUID.randomUUID())
                .fullName("Alex Junior")
                .dob(LocalDate.now().minusYears(15))
                .plan(juniorPlan)
                .build();

        Tab tab = Tab.builder()
                .id(tabId)
                .tabNumber("TAB-101")
                .status(TabStatus.OPEN)
                .member(juniorMember)
                .version(1L)
                .build();

        UUID drinkId = UUID.randomUUID();
        MenuItem cocktail = MenuItem.builder()
                .id(drinkId)
                .name("Classic Mojito")
                .price(new BigDecimal("380.00"))
                .isAlcoholic(true)
                .isAvailable(true)
                .build();

        when(tabRepository.findById(tabId)).thenReturn(Optional.of(tab));
        when(menuItemRepository.findByIdAndIsDeletedFalse(drinkId)).thenReturn(Optional.of(cocktail));

        AddTabItemsRequest req = AddTabItemsRequest.builder()
                .version(1L)
                .items(List.of(AddTabItemDto.builder().menuItemId(drinkId).qty(1).build()))
                .build();

        assertThatThrownBy(() -> tabService.addItemsToTab(tabId, req, waiterUser))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Underage Restriction")
                .matches(ex -> ((BusinessValidationException) ex).getCode().equals("UNDERAGE_ALCOHOL_RESTRICTED"));
    }

    @Test
    @DisplayName("Age safeguard: Guest under 18 cannot order alcoholic items")
    void testUnderageGuestAlcoholicRestriction() {
        UUID tabId = UUID.randomUUID();
        Tab tab = Tab.builder()
                .id(tabId)
                .tabNumber("TAB-102")
                .status(TabStatus.OPEN)
                .guestName("Young Walk-in")
                .guestIsUnder18(true)
                .version(1L)
                .build();

        UUID drinkId = UUID.randomUUID();
        MenuItem whisky = MenuItem.builder()
                .id(drinkId)
                .name("Single Malt Scotch")
                .price(new BigDecimal("650.00"))
                .isAlcoholic(true)
                .isAvailable(true)
                .build();

        when(tabRepository.findById(tabId)).thenReturn(Optional.of(tab));
        when(menuItemRepository.findByIdAndIsDeletedFalse(drinkId)).thenReturn(Optional.of(whisky));

        AddTabItemsRequest req = AddTabItemsRequest.builder()
                .version(1L)
                .items(List.of(AddTabItemDto.builder().menuItemId(drinkId).qty(1).build()))
                .build();

        assertThatThrownBy(() -> tabService.addItemsToTab(tabId, req, waiterUser))
                .isInstanceOf(BusinessValidationException.class)
                .matches(ex -> ((BusinessValidationException) ex).getCode().equals("UNDERAGE_ALCOHOL_RESTRICTED"));
    }

    @Test
    @DisplayName("Optimistic locking: Version mismatch prevents concurrent overwrites")
    void testOptimisticLockConflict() {
        UUID tabId = UUID.randomUUID();
        Tab tab = Tab.builder()
                .id(tabId)
                .tabNumber("TAB-103")
                .status(TabStatus.OPEN)
                .version(3L) // current DB version is 3
                .build();

        when(tabRepository.findById(tabId)).thenReturn(Optional.of(tab));

        // Waiter A sends stale version 2
        AddTabItemsRequest req = AddTabItemsRequest.builder()
                .version(2L)
                .items(List.of(AddTabItemDto.builder().menuItemId(UUID.randomUUID()).qty(1).build()))
                .build();

        assertThatThrownBy(() -> tabService.addItemsToTab(tabId, req, waiterUser))
                .isInstanceOf(BusinessValidationException.class)
                .matches(ex -> ((BusinessValidationException) ex).getCode().equals("CONCURRENT_EDIT_CONFLICT"));
    }

    @Test
    @DisplayName("Edge case: Settle empty tab with 0 items is rejected")
    void testSettleEmptyTabRejected() {
        UUID tabId = UUID.randomUUID();
        Tab tab = Tab.builder()
                .id(tabId)
                .tabNumber("TAB-104")
                .status(TabStatus.OPEN)
                .totalAmount(BigDecimal.ZERO)
                .items(new ArrayList<>())
                .build();

        when(tabRepository.findById(tabId)).thenReturn(Optional.of(tab));

        SettleTabRequest req = SettleTabRequest.builder()
                .paymentMethod(PaymentMethod.CASH)
                .build();

        assertThatThrownBy(() -> tabService.settleTab(tabId, req, waiterUser, null))
                .isInstanceOf(BusinessValidationException.class)
                .matches(ex -> ((BusinessValidationException) ex).getCode().equals("TAB_EMPTY"));
    }

    @Test
    @DisplayName("Edge case: Tab cannot be settled twice")
    void testTabCannotBeSettledTwice() {
        UUID tabId = UUID.randomUUID();
        Tab tab = Tab.builder()
                .id(tabId)
                .tabNumber("TAB-105")
                .status(TabStatus.SETTLED) // Already settled!
                .build();

        when(tabRepository.findById(tabId)).thenReturn(Optional.of(tab));

        SettleTabRequest req = SettleTabRequest.builder()
                .paymentMethod(PaymentMethod.CARD)
                .build();

        assertThatThrownBy(() -> tabService.settleTab(tabId, req, waiterUser, null))
                .isInstanceOf(BusinessValidationException.class)
                .matches(ex -> ((BusinessValidationException) ex).getCode().equals("TAB_ALREADY_SETTLED"));
    }

    @Test
    @DisplayName("Security: Voiding SERVED item requires manager PIN or manager role")
    void testVoidServedItemRequiresManagerPin() {
        UUID tabId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        Tab tab = Tab.builder()
                .id(tabId)
                .tabNumber("TAB-106")
                .status(TabStatus.OPEN)
                .build();

        TabItem servedItem = TabItem.builder()
                .id(itemId)
                .tab(tab)
                .itemName("Artisan Club Sandwich")
                .unitPrice(new BigDecimal("350.00"))
                .qty(1)
                .lineTotal(new BigDecimal("350.00"))
                .status(TabItemStatus.SERVED)
                .build();

        tab.setItems(new ArrayList<>(List.of(servedItem)));

        when(tabRepository.findById(tabId)).thenReturn(Optional.of(tab));
        when(tabItemRepository.findById(itemId)).thenReturn(Optional.of(servedItem));

        // Waiter tries void without PIN
        VoidTabItemRequest reqWithoutPin = VoidTabItemRequest.builder()
                .reason("Customer changed mind after eating")
                .build();

        assertThatThrownBy(() -> tabService.voidTabItem(tabId, itemId, reqWithoutPin, waiterUser))
                .isInstanceOf(BusinessValidationException.class)
                .matches(ex -> ((BusinessValidationException) ex).getCode().equals("MANAGER_PIN_REQUIRED"));

        // Waiter provides correct Manager PIN 1234 -> succeeds!
        VoidTabItemRequest reqWithPin = VoidTabItemRequest.builder()
                .reason("Customer complaint, manager approved")
                .managerPin("1234")
                .build();

        TabDto result = tabService.voidTabItem(tabId, itemId, reqWithPin, waiterUser);
        assertThat(result).isNotNull();
        assertThat(servedItem.getStatus()).isEqualTo(TabItemStatus.VOID);
    }

    @Test
    @DisplayName("Security: Voiding items after tab is settled is strictly forbidden")
    void testVoidAfterSettlementForbidden() {
        UUID tabId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        Tab tab = Tab.builder()
                .id(tabId)
                .tabNumber("TAB-107")
                .status(TabStatus.SETTLED)
                .build();

        when(tabRepository.findById(tabId)).thenReturn(Optional.of(tab));

        VoidTabItemRequest req = VoidTabItemRequest.builder()
                .reason("Mistake")
                .managerPin("1234")
                .build();

        assertThatThrownBy(() -> tabService.voidTabItem(tabId, itemId, req, waiterUser))
                .isInstanceOf(BusinessValidationException.class)
                .matches(ex -> ((BusinessValidationException) ex).getCode().equals("TAB_ALREADY_SETTLED"));
    }

    @Test
    @DisplayName("Inventory: Unavailable menu item in open order is immediately rejected")
    void testUnavailableItemRejected() {
        UUID tabId = UUID.randomUUID();
        Tab tab = Tab.builder()
                .id(tabId)
                .tabNumber("TAB-108")
                .status(TabStatus.OPEN)
                .version(1L)
                .build();

        UUID itemId = UUID.randomUUID();
        MenuItem outOfStockItem = MenuItem.builder()
                .id(itemId)
                .name("Wood-Fired Pizza")
                .price(new BigDecimal("420.00"))
                .isAvailable(false) // unavailable!
                .build();

        when(tabRepository.findById(tabId)).thenReturn(Optional.of(tab));
        when(menuItemRepository.findByIdAndIsDeletedFalse(itemId)).thenReturn(Optional.of(outOfStockItem));

        AddTabItemsRequest req = AddTabItemsRequest.builder()
                .version(1L)
                .items(List.of(AddTabItemDto.builder().menuItemId(itemId).qty(1).build()))
                .build();

        assertThatThrownBy(() -> tabService.addItemsToTab(tabId, req, waiterUser))
                .isInstanceOf(BusinessValidationException.class)
                .matches(ex -> ((BusinessValidationException) ex).getCode().equals("ITEM_UNAVAILABLE"));
    }
}
