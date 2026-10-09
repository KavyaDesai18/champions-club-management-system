package com.championsclub.bar.service;

import com.championsclub.bar.domain.*;
import com.championsclub.bar.dto.*;
import com.championsclub.bar.repo.ShiftRepository;
import com.championsclub.bar.repo.TabItemRepository;
import com.championsclub.bar.repo.TabRepository;
import com.championsclub.billing.domain.CashDrawerSession;
import com.championsclub.billing.domain.LedgerAccount;
import com.championsclub.billing.domain.Payment;
import com.championsclub.billing.repo.LedgerEntryRepository;
import com.championsclub.billing.repo.PaymentRepository;
import com.championsclub.billing.service.CashDrawerService;
import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.member.domain.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShiftService {

    private static final ZoneId CLUB_TIMEZONE = ZoneId.of("Asia/Kolkata");

    private final ShiftRepository shiftRepository;
    private final TabRepository tabRepository;
    private final TabItemRepository tabItemRepository;
    private final PaymentRepository paymentRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final CashDrawerService cashDrawerService;

    @Transactional
    public ShiftDto openShift(OpenShiftRequest req, User staffUser) {
        if (staffUser == null) {
            throw new BusinessValidationException("Staff user must be authenticated", "UNAUTHENTICATED");
        }

        // Check if user already has an active open shift
        Optional<Shift> existingOpen = shiftRepository.findFirstByStaffUserIdAndStatusOrderByStartTimeDesc(
                staffUser.getId(), ShiftStatus.OPEN
        );
        if (existingOpen.isPresent()) {
            throw new BusinessValidationException(
                    "You already have an active open shift on station " + existingOpen.get().getStation() + ". Please close it first.",
                    "SHIFT_ALREADY_OPEN"
            );
        }

        BigDecimal openingCash = req.getOpeningCash() != null
                ? req.getOpeningCash().setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        // Try linking or opening cash drawer session
        CashDrawerSession session = null;
        try {
            var openReq = com.championsclub.billing.dto.OpenDrawerRequest.builder()
                    .openingBalance(openingCash)
                    .notes("Bar Shift Station: " + req.getStation())
                    .build();
            cashDrawerService.openDrawer(staffUser, openReq);
            session = cashDrawerService.getActiveSessionForStaff(staffUser.getId()).orElse(null);
        } catch (Exception e) {
            log.warn("Could not automatically link cash drawer session: {}", e.getMessage());
        }

        Shift shift = Shift.builder()
                .staffUser(staffUser)
                .role(staffUser.getRole() != null ? staffUser.getRole().name() : "BAR_STAFF")
                .station(req.getStation().toUpperCase())
                .startTime(Instant.now())
                .openingCash(openingCash)
                .cashCollected(BigDecimal.ZERO)
                .cashVariance(BigDecimal.ZERO)
                .notes(req.getNotes())
                .status(ShiftStatus.OPEN)
                .cashDrawerSession(session)
                .build();

        Shift saved = shiftRepository.save(shift);
        log.info("Opened Shift [{}] for user [{}] at station [{}] with opening float {}",
                saved.getId(), staffUser.getEmail(), saved.getStation(), saved.getOpeningCash());
        return mapShiftToDto(saved);
    }

    @Transactional
    public ShiftDto closeShift(UUID shiftId, CloseShiftRequest req, User staffUser) {
        Shift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new ResourceNotFoundException("Shift not found with id: " + shiftId));

        if (shift.getStatus() == ShiftStatus.CLOSED) {
            throw new BusinessValidationException("Shift is already closed", "SHIFT_ALREADY_CLOSED");
        }

        // Check open tabs in this shift
        List<Tab> openTabs = tabRepository.findOpenTabsInShift(shift.getId(), TabStatus.OPEN);
        if (!openTabs.isEmpty()) {
            if (Boolean.TRUE.equals(req.getCarryForwardOpenTabs())) {
                if (req.getCarryForwardReason() == null || req.getCarryForwardReason().isBlank()) {
                    throw new BusinessValidationException("A carry-forward reason is required to close shift with open tabs", "CARRY_FORWARD_REASON_REQUIRED");
                }
                for (Tab tab : openTabs) {
                    tab.setIsCarriedForward(true);
                    tab.setCarryForwardReason(req.getCarryForwardReason());
                    tab.setCarryForwardApprovedBy(staffUser);
                    tabRepository.save(tab);
                    log.info("Carried forward open tab [{}] with reason: {}", tab.getTabNumber(), req.getCarryForwardReason());
                }
            } else {
                throw new BusinessValidationException(
                        "Cannot close shift with " + openTabs.size() + " open tab(s). Please settle all tabs or explicitly carry them forward.",
                        "OPEN_TABS_EXIST"
                );
            }
        }

        BigDecimal closingCash = req.getClosingCash().setScale(2, RoundingMode.HALF_UP);
        BigDecimal expectedCash = shift.getOpeningCash().add(shift.getCashCollected()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal variance = closingCash.subtract(expectedCash).setScale(2, RoundingMode.HALF_UP);

        shift.setClosingCash(closingCash);
        shift.setCashVariance(variance);
        shift.setEndTime(Instant.now());
        shift.setStatus(ShiftStatus.CLOSED);
        if (req.getNotes() != null) {
            shift.setNotes(shift.getNotes() != null ? shift.getNotes() + " | " + req.getNotes() : req.getNotes());
        }

        // Close drawer session if linked
        if (shift.getCashDrawerSession() != null) {
            try {
                var closeReq = com.championsclub.billing.dto.CloseDrawerRequest.builder()
                        .closingCashCounted(closingCash)
                        .notes(req.getNotes())
                        .build();
                cashDrawerService.closeDrawer(staffUser, closeReq);
            } catch (Exception e) {
                log.warn("Cash drawer session close notice: {}", e.getMessage());
            }
        }

        Shift saved = shiftRepository.save(shift);
        log.info("Closed Shift [{}] with closing cash: {}, expected: {}, variance: {}",
                saved.getId(), closingCash, expectedCash, variance);
        return mapShiftToDto(saved);
    }

    @Transactional(readOnly = true)
    public ShiftDto getActiveShiftForUser(User staffUser) {
        if (staffUser == null) return null;
        return shiftRepository.findFirstByStaffUserIdAndStatusOrderByStartTimeDesc(staffUser.getId(), ShiftStatus.OPEN)
                .map(this::mapShiftToDto)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public Shift requireActiveShift(User staffUser) {
        if (staffUser == null) {
            throw new BusinessValidationException("Active shift required: unauthenticated user", "UNAUTHENTICATED");
        }
        return shiftRepository.findFirstByStaffUserIdAndStatusOrderByStartTimeDesc(staffUser.getId(), ShiftStatus.OPEN)
                .orElseThrow(() -> new BusinessValidationException(
                        "An open staff shift is required to perform POS orders. Please clock-in / open a shift first.",
                        "ACTIVE_SHIFT_REQUIRED"
                ));
    }

    @Transactional
    public void recordCashPayment(Shift shift, BigDecimal cashAmount) {
        if (shift != null && cashAmount != null && cashAmount.compareTo(BigDecimal.ZERO) > 0) {
            shift.setCashCollected(shift.getCashCollected().add(cashAmount).setScale(2, RoundingMode.HALF_UP));
            shiftRepository.save(shift);
        }
    }

    @Transactional(readOnly = true)
    public DailyCloseReportDto generateDailyCloseReport(LocalDate date) {
        LocalDate reportDate = (date != null) ? date : LocalDate.now(CLUB_TIMEZONE);
        Instant start = reportDate.atStartOfDay(CLUB_TIMEZONE).toInstant();
        Instant end = reportDate.plusDays(1).atStartOfDay(CLUB_TIMEZONE).toInstant();

        List<Tab> tabs = tabRepository.findAllByCreatedAtBetweenOrderByCreatedAtDesc(start, end);
        List<Shift> shifts = shiftRepository.findAllByStartTimeBetweenOrderByStartTimeDesc(start, end);

        BigDecimal totalGross = BigDecimal.ZERO;
        BigDecimal totalDiscounts = BigDecimal.ZERO;
        BigDecimal totalTax = BigDecimal.ZERO;
        BigDecimal totalTips = BigDecimal.ZERO;
        int settledCount = 0;

        Map<String, BigDecimal> revenueByCategory = new LinkedHashMap<>();
        Map<String, BigDecimal> revenueByMethod = new LinkedHashMap<>();

        int voidedCount = 0;
        BigDecimal voidedAmount = BigDecimal.ZERO;

        for (Tab tab : tabs) {
            if (tab.getStatus() == TabStatus.SETTLED) {
                settledCount++;
                totalGross = totalGross.add(tab.getSubtotal());
                totalDiscounts = totalDiscounts.add(tab.getDiscountAmount());
                totalTax = totalTax.add(tab.getTaxAmount());
                totalTips = totalTips.add(tab.getTipAmount());
            }

            // Inspect items for categories and voids
            for (TabItem item : tab.getItems()) {
                if (item.getStatus() == TabItemStatus.VOID) {
                    voidedCount += item.getQty();
                    voidedAmount = voidedAmount.add(item.getLineTotal());
                } else if (tab.getStatus() == TabStatus.SETTLED) {
                    String catName = item.getMenuItem() != null && item.getMenuItem().getCategory() != null
                            ? item.getMenuItem().getCategory().getName()
                            : "General";
                    revenueByCategory.merge(catName, item.getLineTotal(), BigDecimal::add);
                }
            }

            // Inspect payments
            List<Payment> payments = paymentRepository.findBySourceTypeAndSourceId(com.championsclub.billing.domain.PaymentSourceType.TAB, tab.getId().toString());
            for (Payment p : payments) {
                if (p.getStatus() == com.championsclub.billing.domain.PaymentStatus.SUCCEEDED) {
                    String method = p.getMethod().name();
                    revenueByMethod.merge(method, p.getAmount(), BigDecimal::add);
                }
            }
        }

        BigDecimal netRevenue = totalGross.subtract(totalDiscounts).setScale(2, RoundingMode.HALF_UP);

        BigDecimal totalOpeningCash = shifts.stream()
                .map(Shift::getOpeningCash)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalClosingCash = shifts.stream()
                .map(s -> s.getClosingCash() != null ? s.getClosingCash() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalCashVariance = shifts.stream()
                .map(Shift::getCashVariance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Ledger Reconciliation
        BigDecimal ledgerBarRevenue = ledgerEntryRepository.calculateAccountNetBalanceBetween(
                LedgerAccount.BAR_REVENUE, start, end
        );
        BigDecimal ledgerTax = ledgerEntryRepository.calculateAccountNetBalanceBetween(
                LedgerAccount.TAX_PAYABLE, start, end
        );

        boolean ledgerReconciled = true;
        String reconStatus = "Ledger perfectly reconciled with daily close transactions";

        // If settled tabs exist, compare with ledger
        if (settledCount > 0 && ledgerBarRevenue.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal diff = netRevenue.subtract(ledgerBarRevenue).abs();
            if (diff.compareTo(new BigDecimal("1.00")) > 0) {
                ledgerReconciled = false;
                reconStatus = String.format("Variance detected: Net POS revenue (₹%s) != Ledger BAR_REVENUE (₹%s)", netRevenue, ledgerBarRevenue);
            }
        }

        List<Tab> carriedForward = tabRepository.findAllByIsCarriedForwardTrueAndStatus(TabStatus.OPEN);
        List<TabDto> carriedForwardDtos = carriedForward.stream().map(this::mapTabToBasicDto).collect(Collectors.toList());

        return DailyCloseReportDto.builder()
                .reportDate(reportDate)
                .totalGrossRevenue(totalGross.setScale(2, RoundingMode.HALF_UP))
                .totalNetRevenue(netRevenue)
                .totalDiscounts(totalDiscounts.setScale(2, RoundingMode.HALF_UP))
                .totalTaxCollected(totalTax.setScale(2, RoundingMode.HALF_UP))
                .totalTips(totalTips.setScale(2, RoundingMode.HALF_UP))
                .totalTabsSettled(settledCount)
                .totalVoidedItemsCount(voidedCount)
                .totalVoidedAmount(voidedAmount.setScale(2, RoundingMode.HALF_UP))
                .totalOpeningCash(totalOpeningCash.setScale(2, RoundingMode.HALF_UP))
                .totalClosingCash(totalClosingCash.setScale(2, RoundingMode.HALF_UP))
                .totalCashVariance(totalCashVariance.setScale(2, RoundingMode.HALF_UP))
                .revenueByCategory(revenueByCategory)
                .revenueByPaymentMethod(revenueByMethod)
                .ledgerReconciled(ledgerReconciled)
                .ledgerBarRevenueDebitCredit(ledgerBarRevenue.setScale(2, RoundingMode.HALF_UP))
                .ledgerTaxPayable(ledgerTax.setScale(2, RoundingMode.HALF_UP))
                .reconciliationStatusMessage(reconStatus)
                .carriedForwardTabs(carriedForwardDtos)
                .build();
    }

    private ShiftDto mapShiftToDto(Shift s) {
        long openTabsCount = tabRepository.findOpenTabsInShift(s.getId(), TabStatus.OPEN).size();
        return ShiftDto.builder()
                .id(s.getId())
                .staffUserId(s.getStaffUser().getId())
                .staffName(s.getStaffUser().getFullName())
                .role(s.getRole())
                .station(s.getStation())
                .startTime(s.getStartTime())
                .endTime(s.getEndTime())
                .openingCash(s.getOpeningCash())
                .closingCash(s.getClosingCash())
                .cashCollected(s.getCashCollected())
                .cashVariance(s.getCashVariance())
                .notes(s.getNotes())
                .status(s.getStatus())
                .cashDrawerSessionId(s.getCashDrawerSession() != null ? s.getCashDrawerSession().getId() : null)
                .openTabsCount(openTabsCount)
                .build();
    }

    private TabDto mapTabToBasicDto(Tab t) {
        return TabDto.builder()
                .id(t.getId())
                .tabNumber(t.getTabNumber())
                .tableId(t.getTable() != null ? t.getTable().getId() : null)
                .tableLabel(t.getTable() != null ? t.getTable().getLabel() : "Bar / Counter")
                .memberId(t.getMember() != null ? t.getMember().getId() : null)
                .memberName(t.getMember() != null ? t.getMember().getFullName() : null)
                .memberNo(t.getMember() != null ? t.getMember().getMemberNo() : null)
                .guestName(t.getGuestName())
                .status(t.getStatus())
                .totalAmount(t.getTotalAmount())
                .isCarriedForward(t.getIsCarriedForward())
                .carryForwardReason(t.getCarryForwardReason())
                .createdAt(t.getCreatedAt())
                .build();
    }
}
