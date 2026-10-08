package com.championsclub.shop.service;

import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.member.domain.Member;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.MemberRepository;
import com.championsclub.notification.domain.NotificationType;
import com.championsclub.notification.service.NotificationDispatcher;
import com.championsclub.shop.domain.*;
import com.championsclub.shop.dto.ClubServiceDto;
import com.championsclub.shop.dto.ServiceJobTicketDto;
import com.championsclub.shop.repo.ClubServiceRepository;
import com.championsclub.shop.repo.ProductVariantRepository;
import com.championsclub.shop.repo.ServiceJobTicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShopServiceService {

    private final ClubServiceRepository serviceRepository;
    private final ServiceJobTicketRepository ticketRepository;
    private final ProductVariantRepository variantRepository;
    private final MemberRepository memberRepository;
    private final InventoryService inventoryService;
    private final NotificationDispatcher notificationDispatcher;
    private final ShopSseHub shopSseHub;

    private static final AtomicInteger TICKET_COUNTER = new AtomicInteger(100);

    @Transactional(readOnly = true)
    public List<ClubServiceDto> getAllActiveServices() {
        return serviceRepository.findByActiveTrue().stream()
                .map(this::mapServiceToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ServiceJobTicketDto> getAllTickets() {
        return ticketRepository.findAllRecent().stream()
                .map(this::mapTicketToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ServiceJobTicketDto> getTicketsByMember(UUID memberId) {
        return ticketRepository.findByMemberIdOrderByCreatedAtDesc(memberId).stream()
                .map(this::mapTicketToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ServiceJobTicketDto> getUnreturnedLoanTickets() {
        return ticketRepository.findUnreturnedLoans().stream()
                .map(this::mapTicketToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public ServiceJobTicketDto createJobTicket(ServiceJobTicketDto.CreateRequest request, User createdBy) {
        ClubService service = serviceRepository.findById(request.getServiceId())
                .orElseThrow(() -> new ResourceNotFoundException("Club service not found: " + request.getServiceId()));

        Member member = null;
        if (request.getMemberId() != null) {
            member = memberRepository.findByIdAndIsDeletedFalse(request.getMemberId()).orElse(null);
        }

        String ticketNumber = "TCK-" + LocalDate.now().getYear() + "-" + String.format("%04d", TICKET_COUNTER.incrementAndGet());

        ProductVariant loanVariant = null;
        if (request.getLoanVariantId() != null) {
            loanVariant = variantRepository.findByIdAndIsDeletedFalse(request.getLoanVariantId())
                    .orElseThrow(() -> new ResourceNotFoundException("Loan racket variant not found: " + request.getLoanVariantId()));

            // Reserve the loan item in inventory so it cannot be double rented/sold
            inventoryService.reserveStock(
                    loanVariant.getId(),
                    1,
                    ticketNumber,
                    "Loan racket linked to ticket " + ticketNumber,
                    createdBy
            );
        }

        BigDecimal totalPrice = service.getBasePrice();
        if ("SAME_DAY".equalsIgnoreCase(request.getTurnaroundType())) {
            totalPrice = totalPrice.add(new BigDecimal("10.00")); // Rush fee
        }

        ServiceJobTicket ticket = ServiceJobTicket.builder()
                .ticketNumber(ticketNumber)
                .service(service)
                .member(member)
                .guestName(request.getGuestName())
                .guestPhone(request.getGuestPhone())
                .status(JobTicketStatus.RECEIVED)
                .stringType(request.getStringType())
                .tensionLbs(request.getTensionLbs())
                .turnaroundType(request.getTurnaroundType() != null ? request.getTurnaroundType() : "STANDARD_3_DAYS")
                .loanVariant(loanVariant)
                .loanReturned(loanVariant == null)
                .totalPrice(totalPrice)
                .notes(request.getNotes())
                .createdBy(createdBy)
                .build();

        ServiceJobTicket savedTicket = ticketRepository.save(ticket);

        shopSseHub.broadcastEvent("TICKET_CREATED", Map.of(
                "ticketId", savedTicket.getId(),
                "ticketNumber", savedTicket.getTicketNumber(),
                "status", savedTicket.getStatus()
        ));

        return mapTicketToDto(savedTicket);
    }

    @Transactional
    public ServiceJobTicketDto updateTicketStatus(UUID ticketId, ServiceJobTicketDto.UpdateStatusRequest request, User updatedBy) {
        ServiceJobTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Job ticket not found: " + ticketId));

        JobTicketStatus oldStatus = ticket.getStatus();
        JobTicketStatus newStatus = request.getStatus();

        ticket.setStatus(newStatus);
        if (request.getNotes() != null) {
            ticket.setNotes(request.getNotes());
        }

        // Handle loan racket return
        if (Boolean.TRUE.equals(request.getLoanReturned()) && !Boolean.TRUE.equals(ticket.getLoanReturned())) {
            ticket.setLoanReturned(true);
            if (ticket.getLoanVariant() != null) {
                inventoryService.releaseReservedStock(
                        ticket.getLoanVariant().getId(),
                        1,
                        ticket.getTicketNumber(),
                        "Loan racket returned for ticket " + ticket.getTicketNumber(),
                        updatedBy
                );
            }
        }

        if (newStatus == JobTicketStatus.READY || newStatus == JobTicketStatus.COMPLETED) {
            if (newStatus == JobTicketStatus.COMPLETED) {
                ticket.setCompletedAt(Instant.now());
            }

            // Member notification when ready
            if (newStatus == JobTicketStatus.READY && oldStatus != JobTicketStatus.READY && ticket.getMember() != null) {
                Member member = ticket.getMember();
                String msg = "Your racket re-stringing ticket #" + ticket.getTicketNumber() + " is READY for pickup at the Pro Shop counter!";
                try {
                    notificationDispatcher.dispatch(
                            member.getUser(),
                            member,
                            "Racquet Re-Stringing Ready",
                            msg,
                            NotificationType.SERVICE_JOB,
                            null
                    );
                } catch (Exception e) {
                    log.warn("Failed to dispatch member notification for ticket {}: {}", ticket.getTicketNumber(), e.getMessage());
                }
            }
        }

        ServiceJobTicket saved = ticketRepository.save(ticket);

        shopSseHub.broadcastEvent("TICKET_UPDATED", Map.of(
                "ticketId", saved.getId(),
                "ticketNumber", saved.getTicketNumber(),
                "status", saved.getStatus(),
                "loanReturned", saved.getLoanReturned()
        ));

        return mapTicketToDto(saved);
    }

    private ClubServiceDto mapServiceToDto(ClubService s) {
        return ClubServiceDto.builder()
                .id(s.getId())
                .code(s.getCode())
                .name(s.getName())
                .serviceType(s.getServiceType())
                .basePrice(s.getBasePrice())
                .description(s.getDescription())
                .active(s.getActive())
                .build();
    }

    private ServiceJobTicketDto mapTicketToDto(ServiceJobTicket t) {
        return ServiceJobTicketDto.builder()
                .id(t.getId())
                .ticketNumber(t.getTicketNumber())
                .serviceId(t.getService().getId())
                .serviceName(t.getService().getName())
                .memberId(t.getMember() != null ? t.getMember().getId() : null)
                .memberName(t.getMember() != null ? t.getMember().getFullName() : null)
                .memberPhone(t.getMember() != null ? t.getMember().getPhone() : null)
                .guestName(t.getGuestName())
                .guestPhone(t.getGuestPhone())
                .status(t.getStatus())
                .stringType(t.getStringType())
                .tensionLbs(t.getTensionLbs())
                .turnaroundType(t.getTurnaroundType())
                .loanVariantId(t.getLoanVariant() != null ? t.getLoanVariant().getId() : null)
                .loanVariantSku(t.getLoanVariant() != null ? t.getLoanVariant().getSku() : null)
                .loanReturned(t.getLoanReturned())
                .totalPrice(t.getTotalPrice())
                .notes(t.getNotes())
                .createdBy(t.getCreatedBy() != null ? t.getCreatedBy().getFullName() : "SYSTEM")
                .completedAt(t.getCompletedAt())
                .createdAt(t.getCreatedAt())
                .build();
    }
}
