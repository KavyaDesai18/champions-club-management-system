package com.championsclub.billing.service;

import com.championsclub.billing.domain.*;
import com.championsclub.billing.dto.*;
import com.championsclub.billing.repo.CashDrawerEntryRepository;
import com.championsclub.billing.repo.CashDrawerSessionRepository;
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
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CashDrawerService {

    private final CashDrawerSessionRepository sessionRepository;
    private final CashDrawerEntryRepository entryRepository;

    @Transactional
    public CashDrawerSessionResponse openDrawer(User staffUser, OpenDrawerRequest req) {
        // Verify staff does not already have an active drawer session
        Optional<CashDrawerSession> existing = sessionRepository.findByStaffUserIdAndStatus(
                staffUser.getId(), CashDrawerStatus.OPEN
        );
        if (existing.isPresent()) {
            throw new BusinessValidationException(
                    "You already have an active open cash drawer session", "DRAWER_ALREADY_OPEN"
            );
        }

        BigDecimal openingFloat = req.getOpeningBalance() != null ? req.getOpeningBalance() : BigDecimal.ZERO;
        openingFloat = openingFloat.setScale(2, RoundingMode.HALF_UP);

        CashDrawerSession session = CashDrawerSession.builder()
                .staffUser(staffUser)
                .openedAt(Instant.now())
                .openingBalance(openingFloat)
                .calculatedCash(openingFloat)
                .status(CashDrawerStatus.OPEN)
                .notes(req.getNotes())
                .build();

        CashDrawerSession saved = sessionRepository.save(session);

        // Record initial float entry
        CashDrawerEntry entry = CashDrawerEntry.builder()
                .session(saved)
                .entryType(CashDrawerEntryType.OPENING_FLOAT)
                .amount(openingFloat)
                .runningBalance(openingFloat)
                .notes("Shift start opening float")
                .createdBy(staffUser)
                .build();
        entryRepository.save(entry);

        return mapToResponse(saved);
    }

    @Transactional
    public CashDrawerSessionResponse closeDrawer(User staffUser, CloseDrawerRequest req) {
        CashDrawerSession session = sessionRepository.findByStaffUserIdAndStatus(staffUser.getId(), CashDrawerStatus.OPEN)
                .orElseThrow(() -> new BusinessValidationException("No active cash drawer found for current staff", "NO_ACTIVE_DRAWER"));

        BigDecimal counted = req.getClosingCashCounted() != null ? req.getClosingCashCounted() : BigDecimal.ZERO;
        counted = counted.setScale(2, RoundingMode.HALF_UP);

        BigDecimal calculated = session.getCalculatedCash().setScale(2, RoundingMode.HALF_UP);
        BigDecimal discrepancy = counted.subtract(calculated).setScale(2, RoundingMode.HALF_UP);

        session.setClosingBalance(counted);
        session.setDiscrepancy(discrepancy);
        session.setClosedAt(Instant.now());
        session.setStatus(CashDrawerStatus.CLOSED);
        if (req.getNotes() != null && !req.getNotes().isBlank()) {
            session.setNotes((session.getNotes() != null ? session.getNotes() + " | " : "") + req.getNotes());
        }

        CashDrawerSession saved = sessionRepository.save(session);

        CashDrawerEntry closeEntry = CashDrawerEntry.builder()
                .session(saved)
                .entryType(CashDrawerEntryType.CASH_OUT)
                .amount(counted)
                .runningBalance(BigDecimal.ZERO)
                .notes("Shift close actual counted: " + counted + " (Discrepancy: " + discrepancy + ")")
                .createdBy(staffUser)
                .build();
        entryRepository.save(closeEntry);

        return mapToResponse(saved);
    }

    @Transactional
    public void recordCashPayment(CashDrawerSession session, Payment payment, User staffUser) {
        if (session == null || session.getStatus() != CashDrawerStatus.OPEN) {
            return;
        }

        BigDecimal newBalance = session.getCalculatedCash().add(payment.getAmount()).setScale(2, RoundingMode.HALF_UP);
        session.setCalculatedCash(newBalance);
        sessionRepository.save(session);

        CashDrawerEntry entry = CashDrawerEntry.builder()
                .session(session)
                .payment(payment)
                .entryType(CashDrawerEntryType.PAYMENT)
                .amount(payment.getAmount())
                .runningBalance(newBalance)
                .notes("Cash collected for " + payment.getSourceType() + " #" + payment.getSourceId())
                .createdBy(staffUser)
                .build();
        entryRepository.save(entry);
    }

    @Transactional
    public void recordCashRefund(CashDrawerSession session, Refund refund, User staffUser) {
        if (session == null || session.getStatus() != CashDrawerStatus.OPEN) {
            return;
        }

        BigDecimal newBalance = session.getCalculatedCash().subtract(refund.getAmount()).setScale(2, RoundingMode.HALF_UP);
        session.setCalculatedCash(newBalance);
        sessionRepository.save(session);

        CashDrawerEntry entry = CashDrawerEntry.builder()
                .session(session)
                .refund(refund)
                .entryType(CashDrawerEntryType.REFUND)
                .amount(refund.getAmount())
                .runningBalance(newBalance)
                .notes("Cash payout for refund: " + refund.getReason())
                .createdBy(staffUser)
                .build();
        entryRepository.save(entry);
    }

    @Transactional(readOnly = true)
    public Optional<CashDrawerSession> getActiveSessionForStaff(UUID staffUserId) {
        return sessionRepository.findByStaffUserIdAndStatus(staffUserId, CashDrawerStatus.OPEN);
    }

    @Transactional(readOnly = true)
    public List<CashDrawerSessionResponse> getAllRecentSessions() {
        return sessionRepository.findAllRecentSessions().stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CashDrawerSessionResponse getSessionDetails(UUID sessionId) {
        CashDrawerSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("CashDrawerSession", sessionId));
        return mapToResponse(session);
    }

    private CashDrawerSessionResponse mapToResponse(CashDrawerSession s) {
        List<CashDrawerEntryDto> entries = entryRepository.findBySessionIdOrderByCreatedAtAsc(s.getId()).stream()
                .map(e -> CashDrawerEntryDto.builder()
                        .id(e.getId())
                        .entryType(e.getEntryType())
                        .amount(e.getAmount())
                        .runningBalance(e.getRunningBalance())
                        .paymentId(e.getPayment() != null ? e.getPayment().getId() : null)
                        .refundId(e.getRefund() != null ? e.getRefund().getId() : null)
                        .notes(e.getNotes())
                        .createdAt(e.getCreatedAt())
                        .build())
                .toList();

        return CashDrawerSessionResponse.builder()
                .id(s.getId())
                .staffUserId(s.getStaffUser().getId())
                .staffName(s.getStaffUser().getFullName())
                .openedAt(s.getOpenedAt())
                .closedAt(s.getClosedAt())
                .openingBalance(s.getOpeningBalance())
                .closingBalance(s.getClosingBalance())
                .calculatedCash(s.getCalculatedCash())
                .discrepancy(s.getDiscrepancy())
                .status(s.getStatus())
                .notes(s.getNotes())
                .entries(entries)
                .build();
    }
}
