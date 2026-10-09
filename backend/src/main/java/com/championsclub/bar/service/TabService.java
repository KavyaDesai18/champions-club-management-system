package com.championsclub.bar.service;

import com.championsclub.bar.domain.*;
import com.championsclub.bar.dto.*;
import com.championsclub.bar.repo.*;
import com.championsclub.billing.domain.PaymentMethod;
import com.championsclub.billing.domain.PaymentSourceType;
import com.championsclub.billing.dto.PaymentRequest;
import com.championsclub.billing.dto.PaymentResponse;
import com.championsclub.billing.service.PaymentService;
import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.member.domain.Member;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Period;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TabService {

    private static final String DEFAULT_MANAGER_PIN = "1234";
    private static final BigDecimal DEFAULT_MEMBER_CREDIT_LIMIT = new BigDecimal("5000.00");

    private final TabRepository tabRepository;
    private final TabItemRepository tabItemRepository;
    private final BarTableRepository tableRepository;
    private final MenuItemRepository menuItemRepository;
    private final KitchenTicketRepository kitchenTicketRepository;
    private final KitchenTicketItemRepository kitchenTicketItemRepository;
    private final TabSplitRepository tabSplitRepository;
    private final MemberRepository memberRepository;
    private final ShiftService shiftService;
    private final KitchenDisplayService kitchenDisplayService;
    private final PaymentService paymentService;
    private final JdbcTemplate jdbcTemplate;

    @Transactional
    public TabDto createTab(CreateTabRequest req, User staffUser) {
        Shift activeShift = shiftService.requireActiveShift(staffUser);

        BarTable table = null;
        if (req.getTableId() != null) {
            table = tableRepository.findById(req.getTableId())
                    .orElseThrow(() -> new ResourceNotFoundException("Bar table not found with id: " + req.getTableId()));

            if (table.getStatus() == TableStatus.OCCUPIED) {
                // Check if there is already an open tab on this table
                Optional<Tab> existingTab = tabRepository.findFirstByTableIdAndStatus(table.getId(), TabStatus.OPEN);
                if (existingTab.isPresent()) {
                    throw new BusinessValidationException(
                            "Table " + table.getLabel() + " is already occupied by Tab #" + existingTab.get().getTabNumber(),
                            "TABLE_ALREADY_OCCUPIED"
                    );
                }
            }
            table.setStatus(TableStatus.OCCUPIED);
            tableRepository.save(table);
        }

        Member member = null;
        if (req.getMemberId() != null) {
            member = memberRepository.findByIdAndIsDeletedFalse(req.getMemberId())
                    .orElseThrow(() -> new ResourceNotFoundException("Member not found with id: " + req.getMemberId()));

            // Credit Limit Safeguard: calculate sum of open tabs for this member
            List<Tab> openTabs = tabRepository.findAllByMemberIdAndStatus(member.getId(), TabStatus.OPEN);
            BigDecimal currentUnsettled = openTabs.stream()
                    .map(Tab::getTotalAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            if (currentUnsettled.compareTo(DEFAULT_MEMBER_CREDIT_LIMIT) >= 0) {
                throw new BusinessValidationException(
                        String.format("Member credit limit reached! Member has %d unsettled tab(s) totaling ₹%s (Limit: ₹%s). Settlement required.",
                                openTabs.size(), currentUnsettled, DEFAULT_MEMBER_CREDIT_LIMIT),
                        "TAB_CREDIT_LIMIT_EXCEEDED"
                );
            }
        }

        long nextTabNo = fetchNextSequence("tab_no_seq");
        String tabNumber = "TAB-" + nextTabNo;

        Tab tab = Tab.builder()
                .tabNumber(tabNumber)
                .table(table)
                .member(member)
                .guestName(req.getGuestName())
                .guestIsUnder18(Boolean.TRUE.equals(req.getGuestIsUnder18()))
                .status(TabStatus.OPEN)
                .openedBy(staffUser)
                .shift(activeShift)
                .subtotal(BigDecimal.ZERO)
                .discountAmount(BigDecimal.ZERO)
                .taxAmount(BigDecimal.ZERO)
                .tipAmount(BigDecimal.ZERO)
                .totalAmount(BigDecimal.ZERO)
                .paidAmount(BigDecimal.ZERO)
                .version(0L)
                .build();

        Tab saved = tabRepository.save(tab);
        log.info("Created Tab [{}] for table [{}], member [{}]",
                saved.getTabNumber(), table != null ? table.getLabel() : "Counter", member != null ? member.getFullName() : req.getGuestName());
        return mapTabToDto(saved);
    }

    @Transactional
    public TabDto addItemsToTab(UUID tabId, AddTabItemsRequest req, User staffUser) {
        shiftService.requireActiveShift(staffUser);

        Tab tab = tabRepository.findById(tabId)
                .orElseThrow(() -> new ResourceNotFoundException("Tab not found with id: " + tabId));

        if (tab.getStatus() != TabStatus.OPEN) {
            throw new BusinessValidationException("Cannot add items to a " + tab.getStatus() + " tab", "TAB_NOT_OPEN");
        }

        // Optimistic Locking Guard
        if (req.getVersion() != null && !req.getVersion().equals(tab.getVersion())) {
            log.warn("Optimistic lock conflict on Tab [{}]: Client sent version {}, DB has {}",
                    tab.getTabNumber(), req.getVersion(), tab.getVersion());
            throw new BusinessValidationException(
                    "Tab was updated by another terminal/server. Please refresh to load latest items.",
                    "CONCURRENT_EDIT_CONFLICT"
            );
        }

        // Age Safeguard Evaluation
        boolean isUnderage = isCustomerUnderage(tab);

        // Member Plan Discount Rate
        BigDecimal discountPct = BigDecimal.ZERO;
        if (tab.getMember() != null && tab.getMember().getPlan() != null) {
            discountPct = tab.getMember().getPlan().getBarDiscountPct() != null
                    ? tab.getMember().getPlan().getBarDiscountPct()
                    : BigDecimal.ZERO;
        }

        List<TabItem> newItems = new ArrayList<>();

        for (AddTabItemDto itemReq : req.getItems()) {
            MenuItem menuItem = menuItemRepository.findByIdAndIsDeletedFalse(itemReq.getMenuItemId())
                    .orElseThrow(() -> new ResourceNotFoundException("Menu item not found with id: " + itemReq.getMenuItemId()));

            // Availability check: unavailable item in open order is rejected!
            if (Boolean.FALSE.equals(menuItem.getIsAvailable())) {
                throw new BusinessValidationException(
                        "Menu item '" + menuItem.getName() + "' is currently out of stock / unavailable.",
                        "ITEM_UNAVAILABLE"
                );
            }

            // Alcoholic age restriction safeguard
            if (Boolean.TRUE.equals(menuItem.getIsAlcoholic()) && isUnderage) {
                throw new BusinessValidationException(
                        String.format("Underage Restriction: Alcoholic beverage '%s' cannot be ordered for Junior members or guests under 18 years of age.",
                                menuItem.getName()),
                        "UNDERAGE_ALCOHOL_RESTRICTED"
                );
            }

            int qty = itemReq.getQty() != null ? itemReq.getQty() : 1;
            BigDecimal unitPrice = menuItem.getPrice().setScale(2, RoundingMode.HALF_UP);
            BigDecimal grossLine = unitPrice.multiply(BigDecimal.valueOf(qty)).setScale(2, RoundingMode.HALF_UP);

            BigDecimal lineDiscount = grossLine.multiply(discountPct)
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

            BigDecimal netLine = grossLine.subtract(lineDiscount);

            BigDecimal taxRate = "GST_18".equalsIgnoreCase(menuItem.getTaxCategory())
                    ? new BigDecimal("18.00")
                    : new BigDecimal("5.00");

            BigDecimal lineTax = netLine.multiply(taxRate)
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

            BigDecimal lineTotal = netLine.add(lineTax).setScale(2, RoundingMode.HALF_UP);

            TabItem tabItem = TabItem.builder()
                    .tab(tab)
                    .menuItem(menuItem)
                    .itemName(menuItem.getName())
                    .station(menuItem.getPrepStation())
                    .unitPrice(unitPrice)
                    .qty(qty)
                    .discountRatePct(discountPct)
                    .discountAmount(lineDiscount)
                    .taxRatePct(taxRate)
                    .taxAmount(lineTax)
                    .lineTotal(lineTotal)
                    .notes(itemReq.getNotes())
                    .modifiers(itemReq.getModifiers() != null ? itemReq.getModifiers() : "[]")
                    .status(TabItemStatus.NEW)
                    .build();

            TabItem savedItem = tabItemRepository.save(tabItem);
            newItems.add(savedItem);
        }

        // Generate Kitchen Tickets per prep station (KITCHEN vs BAR)
        Map<StationType, List<TabItem>> itemsByStation = newItems.stream()
                .collect(Collectors.groupingBy(TabItem::getStation));

        for (Map.Entry<StationType, List<TabItem>> entry : itemsByStation.entrySet()) {
            StationType station = entry.getKey();
            List<TabItem> stationItems = entry.getValue();

            long tktSeq = fetchNextSequence("kitchen_ticket_no_seq");
            String ticketNumber = "TKT-" + tktSeq;

            KitchenTicket ticket = KitchenTicket.builder()
                    .ticketNumber(ticketNumber)
                    .tab(tab)
                    .table(tab.getTable())
                    .tableLabel(tab.getTable() != null ? tab.getTable().getLabel() : "Bar / Counter")
                    .station(station)
                    .status(KitchenTicketStatus.NEW)
                    .orderNotes("Order via " + staffUser.getFullName())
                    .build();

            KitchenTicket savedTicket = kitchenTicketRepository.save(ticket);

            for (TabItem ti : stationItems) {
                KitchenTicketItem kti = KitchenTicketItem.builder()
                        .ticket(savedTicket)
                        .tabItem(ti)
                        .itemName(ti.getItemName())
                        .qty(ti.getQty())
                        .modifiers(ti.getModifiers())
                        .notes(ti.getNotes())
                        .status(TabItemStatus.NEW)
                        .build();
                kitchenTicketItemRepository.save(kti);
            }

            // Real-time SSE alert to Kitchen / Bar display
            kitchenDisplayService.broadcastEvent(
                    "NEW_TICKET",
                    kitchenDisplayService.mapTicketToDto(savedTicket, Instant.now()),
                    station
            );
        }

        // Recalculate Tab Totals
        recalculateTabTotals(tab);
        tab.setVersion(tab.getVersion() + 1L);
        Tab updatedTab = tabRepository.save(tab);

        log.info("Added {} items to Tab [{}]. New total: ₹{}",
                newItems.size(), updatedTab.getTabNumber(), updatedTab.getTotalAmount());
        return mapTabToDto(updatedTab);
    }

    @Transactional
    public TabDto voidTabItem(UUID tabId, UUID itemId, VoidTabItemRequest req, User staffUser) {
        Tab tab = tabRepository.findById(tabId)
                .orElseThrow(() -> new ResourceNotFoundException("Tab not found with id: " + tabId));

        // Invariant: Tab cannot have items voided after settlement
        if (tab.getStatus() == TabStatus.SETTLED) {
            throw new BusinessValidationException("Cannot void items on an already settled tab", "TAB_ALREADY_SETTLED");
        }

        TabItem item = tabItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Tab item not found with id: " + itemId));

        if (!item.getTab().getId().equals(tabId)) {
            throw new BusinessValidationException("Item does not belong to this tab", "INVALID_ITEM");
        }

        if (item.getStatus() == TabItemStatus.VOID) {
            throw new BusinessValidationException("Item is already voided", "ITEM_ALREADY_VOIDED");
        }

        // Manager PIN / Role Guard for SERVED items
        if (item.getStatus() == TabItemStatus.SERVED) {
            boolean isManagerOrOwner = staffUser.getRole() != null &&
                    (staffUser.getRole().name().equals("MANAGER") || staffUser.getRole().name().equals("OWNER"));

            boolean validPin = req.getManagerPin() != null && DEFAULT_MANAGER_PIN.equals(req.getManagerPin().trim());

            if (!isManagerOrOwner && !validPin) {
                throw new BusinessValidationException(
                        "Manager authorization required: Voiding a served item requires a Manager role or valid Manager PIN.",
                        "MANAGER_PIN_REQUIRED"
                );
            }
        }

        item.setStatus(TabItemStatus.VOID);
        item.setVoidedBy(staffUser);
        item.setVoidReason(req.getReason());
        tabItemRepository.save(item);

        // Cancel corresponding Kitchen ticket item if present
        kitchenTicketItemRepository.findByTabItemId(item.getId()).ifPresent(kti -> {
            kti.setStatus(TabItemStatus.VOID);
            kitchenTicketItemRepository.save(kti);
            kitchenDisplayService.broadcastEvent(
                    "ITEM_VOIDED",
                    Map.of("ticketItemId", kti.getId(), "reason", req.getReason()),
                    kti.getTicket() != null ? kti.getTicket().getStation() : null
            );
        });

        recalculateTabTotals(tab);
        tab.setVersion(tab.getVersion() + 1L);
        Tab updatedTab = tabRepository.save(tab);

        log.info("Voided TabItem [{}] on Tab [{}] by user [{}]. Reason: {}",
                item.getItemName(), tab.getTabNumber(), staffUser.getEmail(), req.getReason());
        return mapTabToDto(updatedTab);
    }

    @Transactional
    public List<TabSplitDto> splitBill(UUID tabId, SplitBillRequest req) {
        Tab tab = tabRepository.findById(tabId)
                .orElseThrow(() -> new ResourceNotFoundException("Tab not found with id: " + tabId));

        if (tab.getStatus() != TabStatus.OPEN) {
            throw new BusinessValidationException("Can only split an OPEN tab", "TAB_NOT_OPEN");
        }

        List<TabItem> activeItems = tab.getItems().stream()
                .filter(i -> i.getStatus() != TabItemStatus.VOID)
                .collect(Collectors.toList());

        if (activeItems.isEmpty()) {
            throw new BusinessValidationException("Cannot split an empty tab with no items", "TAB_EMPTY");
        }

        // Clear existing pending splits
        tabSplitRepository.deleteAllByTabId(tab.getId());

        List<TabSplit> splits = new ArrayList<>();
        BigDecimal totalAmount = tab.getTotalAmount();

        if (req.getSplitType() == SplitType.EQUAL) {
            int count = (req.getSplitCount() != null && req.getSplitCount() >= 2) ? req.getSplitCount() : 2;

            // Penny-exact split calculation (table-driven rounding)
            // e.g. 100.00 / 3 = 33.34, 33.33, 33.33. Sum strictly equals 100.00
            long totalCents = totalAmount.multiply(BigDecimal.valueOf(100)).longValue();
            long baseCents = totalCents / count;
            long remainderCents = totalCents % count;

            for (int i = 0; i < count; i++) {
                long cents = baseCents + (i < remainderCents ? 1 : 0);
                BigDecimal splitAmount = BigDecimal.valueOf(cents, 2);

                TabSplit split = TabSplit.builder()
                        .tab(tab)
                        .splitNumber(i + 1)
                        .splitType(SplitType.EQUAL)
                        .amount(splitAmount)
                        .status("PENDING")
                        .build();
                splits.add(tabSplitRepository.save(split));
            }
        } else if (req.getSplitType() == SplitType.BY_ITEM && req.getItemSplits() != null) {
            int splitNo = 1;
            for (List<UUID> itemIds : req.getItemSplits()) {
                BigDecimal splitSubtotal = BigDecimal.ZERO;
                BigDecimal splitTax = BigDecimal.ZERO;
                BigDecimal splitDiscount = BigDecimal.ZERO;

                for (UUID itemId : itemIds) {
                    TabItem ti = activeItems.stream().filter(it -> it.getId().equals(itemId)).findFirst().orElse(null);
                    if (ti != null) {
                        splitSubtotal = splitSubtotal.add(ti.getUnitPrice().multiply(BigDecimal.valueOf(ti.getQty())));
                        splitTax = splitTax.add(ti.getTaxAmount());
                        splitDiscount = splitDiscount.add(ti.getDiscountAmount());
                    }
                }

                BigDecimal splitAmount = splitSubtotal.subtract(splitDiscount).add(splitTax).setScale(2, RoundingMode.HALF_UP);

                TabSplit split = TabSplit.builder()
                        .tab(tab)
                        .splitNumber(splitNo++)
                        .splitType(SplitType.BY_ITEM)
                        .amount(splitAmount)
                        .taxAmount(splitTax)
                        .discountAmount(splitDiscount)
                        .itemIds(itemIds.toString())
                        .status("PENDING")
                        .build();
                splits.add(tabSplitRepository.save(split));
            }
        }

        return splits.stream().map(this::mapSplitToDto).collect(Collectors.toList());
    }

    @Transactional
    public TabDto settleTab(UUID tabId, SettleTabRequest req, User staffUser, String idempotencyKey) {
        Tab tab = tabRepository.findById(tabId)
                .orElseThrow(() -> new ResourceNotFoundException("Tab not found with id: " + tabId));

        // Edge case: Tab cannot be settled twice
        if (tab.getStatus() == TabStatus.SETTLED) {
            throw new BusinessValidationException("Tab #" + tab.getTabNumber() + " is already settled", "TAB_ALREADY_SETTLED");
        }

        // Edge case: Settle with 0 items
        List<TabItem> activeItems = tab.getItems().stream()
                .filter(i -> i.getStatus() != TabItemStatus.VOID)
                .collect(Collectors.toList());

        if (activeItems.isEmpty()) {
            throw new BusinessValidationException("Cannot settle an empty tab with 0 items", "TAB_EMPTY");
        }

        // Transition any items still NEW or PREPARING to SERVED upon settlement
        for (TabItem item : activeItems) {
            if (item.getStatus() == TabItemStatus.NEW || item.getStatus() == TabItemStatus.PREPARING || item.getStatus() == TabItemStatus.READY) {
                item.setStatus(TabItemStatus.SERVED);
                tabItemRepository.save(item);
            }
        }

        // Complete any open kitchen tickets for this tab
        kitchenTicketRepository.findAllByTabIdOrderByCreatedAtDesc(tab.getId()).forEach(tkt -> {
            if (tkt.getStatus() != KitchenTicketStatus.COMPLETED && tkt.getStatus() != KitchenTicketStatus.CANCELLED) {
                tkt.setStatus(KitchenTicketStatus.COMPLETED);
                kitchenTicketRepository.save(tkt);
            }
        });

        // Tip handling
        BigDecimal tip = req.getTipAmount() != null && req.getTipAmount().compareTo(BigDecimal.ZERO) > 0
                ? req.getTipAmount().setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        if (tip.compareTo(BigDecimal.ZERO) > 0) {
            tab.setTipAmount(tip);
            tab.setTotalAmount(tab.getTotalAmount().add(tip).setScale(2, RoundingMode.HALF_UP));
        }

        BigDecimal paymentAmount;
        TabSplit split = null;

        if (req.getSplitId() != null) {
            split = tabSplitRepository.findById(req.getSplitId())
                    .orElseThrow(() -> new ResourceNotFoundException("Tab split not found with id: " + req.getSplitId()));
            paymentAmount = split.getAmount().add(tip);
        } else {
            paymentAmount = tab.getTotalAmount();
        }

        // Reuse P10 PaymentService: processes payment, records to payments table, posts balanced double-entry ledger!
        PaymentRequest pReq = PaymentRequest.builder()
                .amount(paymentAmount)
                .method(req.getPaymentMethod())
                .sourceType(PaymentSourceType.TAB)
                .sourceId(tab.getId().toString())
                .memberId(tab.getMember() != null ? tab.getMember().getId() : null)
                .payerName(tab.getMember() != null ? tab.getMember().getFullName() : tab.getGuestName())
                .build();

        PaymentResponse paymentRes = paymentService.processPayment(pReq, idempotencyKey, staffUser);

        // If Cash payment, record in active shift cash collection
        if (req.getPaymentMethod() == PaymentMethod.CASH && tab.getShift() != null) {
            shiftService.recordCashPayment(tab.getShift(), paymentAmount);
        }

        if (split != null) {
            split.setStatus("PAID");
            split.setTipAmount(tip);
            tabSplitRepository.save(split);
        }

        tab.setPaidAmount(tab.getPaidAmount().add(paymentAmount).setScale(2, RoundingMode.HALF_UP));

        // Check if fully settled
        if (tab.getPaidAmount().compareTo(tab.getTotalAmount()) >= 0) {
            tab.setStatus(TabStatus.SETTLED);
            tab.setSettledAt(Instant.now());

            // Release table
            if (tab.getTable() != null) {
                tab.getTable().setStatus(TableStatus.FREE);
                tableRepository.save(tab.getTable());
                log.info("Released Table [{}] on Tab [{}] settlement", tab.getTable().getLabel(), tab.getTabNumber());
            }
        }

        tab.setVersion(tab.getVersion() + 1L);
        Tab settled = tabRepository.save(tab);

        log.info("Settled Tab [{}] via {} for amount ₹{}",
                settled.getTabNumber(), req.getPaymentMethod(), paymentAmount);
        return mapTabToDto(settled);
    }

    @Transactional
    public TabDto carryForwardTab(UUID tabId, CarryForwardTabRequest req, User staffUser) {
        Tab tab = tabRepository.findById(tabId)
                .orElseThrow(() -> new ResourceNotFoundException("Tab not found with id: " + tabId));

        if (tab.getStatus() != TabStatus.OPEN) {
            throw new BusinessValidationException("Can only carry forward an OPEN tab", "TAB_NOT_OPEN");
        }

        tab.setIsCarriedForward(true);
        tab.setCarryForwardReason(req.getReason());
        tab.setCarryForwardApprovedBy(staffUser);
        Tab saved = tabRepository.save(tab);

        log.info("Carried forward Tab [{}] by [{}] with reason: {}",
                saved.getTabNumber(), staffUser.getEmail(), req.getReason());
        return mapTabToDto(saved);
    }

    @Transactional(readOnly = true)
    public TabDto getTabById(UUID tabId) {
        Tab tab = tabRepository.findById(tabId)
                .orElseThrow(() -> new ResourceNotFoundException("Tab not found with id: " + tabId));
        return mapTabToDto(tab);
    }

    @Transactional(readOnly = true)
    public List<TabDto> getOpenTabs() {
        return tabRepository.findAllByStatusOrderByCreatedAtDesc(TabStatus.OPEN).stream()
                .map(this::mapTabToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TabDto> getUnsettledTabsForMember(UUID memberId) {
        return tabRepository.findAllByMemberIdAndStatus(memberId, TabStatus.OPEN).stream()
                .map(this::mapTabToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TabSplitDto> getTabSplits(UUID tabId) {
        return tabSplitRepository.findAllByTabIdOrderBySplitNumberAsc(tabId).stream()
                .map(this::mapSplitToDto)
                .collect(Collectors.toList());
    }

    private void recalculateTabTotals(Tab tab) {
        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal totalDiscount = BigDecimal.ZERO;
        BigDecimal totalTax = BigDecimal.ZERO;

        for (TabItem item : tab.getItems()) {
            if (item.getStatus() != TabItemStatus.VOID) {
                BigDecimal gross = item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQty()));
                subtotal = subtotal.add(gross);
                totalDiscount = totalDiscount.add(item.getDiscountAmount());
                totalTax = totalTax.add(item.getTaxAmount());
            }
        }

        subtotal = subtotal.setScale(2, RoundingMode.HALF_UP);
        totalDiscount = totalDiscount.setScale(2, RoundingMode.HALF_UP);
        totalTax = totalTax.setScale(2, RoundingMode.HALF_UP);
        BigDecimal net = subtotal.subtract(totalDiscount);
        BigDecimal grandTotal = net.add(totalTax).add(tab.getTipAmount()).setScale(2, RoundingMode.HALF_UP);

        tab.setSubtotal(subtotal);
        tab.setDiscountAmount(totalDiscount);
        tab.setTaxAmount(totalTax);
        tab.setTotalAmount(grandTotal);
    }

    private boolean isCustomerUnderage(Tab tab) {
        if (Boolean.TRUE.equals(tab.getGuestIsUnder18())) {
            return true;
        }
        if (tab.getMember() != null) {
            Member m = tab.getMember();
            if (m.getPlan() != null && "JUNIOR".equalsIgnoreCase(m.getPlan().getCode())) {
                return true;
            }
            if (m.getDob() != null) {
                int age = Period.between(m.getDob(), LocalDate.now()).getYears();
                if (age < 18) {
                    return true;
                }
            }
        }
        return false;
    }

    private long fetchNextSequence(String seqName) {
        try {
            Long val = jdbcTemplate.queryForObject("SELECT nextval('" + seqName + "')", Long.class);
            return val != null ? val : System.currentTimeMillis();
        } catch (Exception e) {
            return System.currentTimeMillis() % 100000;
        }
    }

    public TabDto mapTabToDto(Tab t) {
        List<TabItemDto> itemDtos = t.getItems().stream().map(i -> TabItemDto.builder()
                .id(i.getId())
                .tabId(t.getId())
                .menuItemId(i.getMenuItem() != null ? i.getMenuItem().getId() : null)
                .itemName(i.getItemName())
                .station(i.getStation())
                .unitPrice(i.getUnitPrice())
                .qty(i.getQty())
                .discountRatePct(i.getDiscountRatePct())
                .discountAmount(i.getDiscountAmount())
                .taxRatePct(i.getTaxRatePct())
                .taxAmount(i.getTaxAmount())
                .lineTotal(i.getLineTotal())
                .notes(i.getNotes())
                .modifiers(i.getModifiers())
                .status(i.getStatus())
                .voidedByName(i.getVoidedBy() != null ? i.getVoidedBy().getFullName() : null)
                .voidReason(i.getVoidReason())
                .createdAt(i.getCreatedAt())
                .build()
        ).collect(Collectors.toList());

        return TabDto.builder()
                .id(t.getId())
                .tabNumber(t.getTabNumber())
                .tableId(t.getTable() != null ? t.getTable().getId() : null)
                .tableLabel(t.getTable() != null ? t.getTable().getLabel() : "Bar / Counter")
                .memberId(t.getMember() != null ? t.getMember().getId() : null)
                .memberName(t.getMember() != null ? t.getMember().getFullName() : null)
                .memberNo(t.getMember() != null ? t.getMember().getMemberNo() : null)
                .memberPlanCode(t.getMember() != null && t.getMember().getPlan() != null ? t.getMember().getPlan().getCode() : null)
                .memberPlanDiscountPct(t.getMember() != null && t.getMember().getPlan() != null ? t.getMember().getPlan().getBarDiscountPct() : BigDecimal.ZERO)
                .guestName(t.getGuestName())
                .guestIsUnder18(t.getGuestIsUnder18())
                .status(t.getStatus())
                .openedByUserId(t.getOpenedBy() != null ? t.getOpenedBy().getId() : null)
                .openedByName(t.getOpenedBy() != null ? t.getOpenedBy().getFullName() : null)
                .shiftId(t.getShift() != null ? t.getShift().getId() : null)
                .subtotal(t.getSubtotal())
                .discountAmount(t.getDiscountAmount())
                .taxAmount(t.getTaxAmount())
                .tipAmount(t.getTipAmount())
                .totalAmount(t.getTotalAmount())
                .paidAmount(t.getPaidAmount())
                .isCarriedForward(t.getIsCarriedForward())
                .carryForwardReason(t.getCarryForwardReason())
                .version(t.getVersion())
                .items(itemDtos)
                .createdAt(t.getCreatedAt())
                .settledAt(t.getSettledAt())
                .build();
    }

    private TabSplitDto mapSplitToDto(TabSplit s) {
        return TabSplitDto.builder()
                .id(s.getId())
                .tabId(s.getTab().getId())
                .splitNumber(s.getSplitNumber())
                .splitType(s.getSplitType())
                .amount(s.getAmount())
                .tipAmount(s.getTipAmount())
                .taxAmount(s.getTaxAmount())
                .discountAmount(s.getDiscountAmount())
                .paymentId(s.getPayment() != null ? s.getPayment().getId() : null)
                .status(s.getStatus())
                .itemIds(s.getItemIds())
                .build();
    }
}
