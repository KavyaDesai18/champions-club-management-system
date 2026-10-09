package com.championsclub.bar.service;

import com.championsclub.bar.domain.*;
import com.championsclub.bar.dto.KitchenTicketDto;
import com.championsclub.bar.dto.KitchenTicketItemDto;
import com.championsclub.bar.repo.KitchenTicketItemRepository;
import com.championsclub.bar.repo.KitchenTicketRepository;
import com.championsclub.bar.repo.TabItemRepository;
import com.championsclub.common.error.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class KitchenDisplayService {

    private final KitchenTicketRepository ticketRepository;
    private final KitchenTicketItemRepository ticketItemRepository;
    private final TabItemRepository tabItemRepository;

    private static class StationEmitter {
        final SseEmitter emitter;
        final String station;

        StationEmitter(SseEmitter emitter, String station) {
            this.emitter = emitter;
            this.station = station != null ? station.toUpperCase() : "ALL";
        }
    }

    private final List<StationEmitter> emitters = new CopyOnWriteArrayList<>();

    public SseEmitter registerEmitter(String stationFilter) {
        SseEmitter emitter = new SseEmitter(120_000L); // 2 minutes timeout
        StationEmitter se = new StationEmitter(emitter, stationFilter);
        emitters.add(se);

        emitter.onCompletion(() -> emitters.remove(se));
        emitter.onTimeout(() -> {
            emitter.complete();
            emitters.remove(se);
        });
        emitter.onError(e -> {
            emitter.complete();
            emitters.remove(se);
        });

        // Send initial connection handshake event
        try {
            emitter.send(SseEmitter.event()
                    .name("CONNECTED")
                    .data(Map.of("message", "Connected to KDS SSE stream", "timestamp", Instant.now().toString()))
            );
        } catch (IOException e) {
            emitters.remove(se);
        }

        return emitter;
    }

    public void broadcastEvent(String eventType, Object data, StationType targetStation) {
        List<StationEmitter> deadEmitters = new ArrayList<>();

        for (StationEmitter se : emitters) {
            boolean shouldSend = "ALL".equalsIgnoreCase(se.station)
                    || (targetStation != null && targetStation.name().equalsIgnoreCase(se.station));

            if (shouldSend) {
                try {
                    se.emitter.send(SseEmitter.event()
                            .name(eventType)
                            .data(data)
                    );
                } catch (Exception e) {
                    deadEmitters.add(se);
                }
            }
        }

        if (!deadEmitters.isEmpty()) {
            emitters.removeAll(deadEmitters);
        }
    }

    @Transactional(readOnly = true)
    public List<KitchenTicketDto> getActiveTickets(String stationFilter) {
        List<KitchenTicketStatus> excludedStatuses = List.of(KitchenTicketStatus.COMPLETED, KitchenTicketStatus.CANCELLED);
        List<KitchenTicket> tickets;

        if (stationFilter != null && !stationFilter.isBlank() && !"ALL".equalsIgnoreCase(stationFilter)) {
            try {
                StationType st = StationType.valueOf(stationFilter.toUpperCase());
                tickets = ticketRepository.findAllByStationAndStatusNotInOrderByCreatedAtAsc(st, excludedStatuses);
            } catch (IllegalArgumentException e) {
                tickets = ticketRepository.findAllByStatusNotInOrderByCreatedAtAsc(excludedStatuses);
            }
        } else {
            tickets = ticketRepository.findAllByStatusNotInOrderByCreatedAtAsc(excludedStatuses);
        }

        Instant now = Instant.now();
        return tickets.stream().map(t -> mapTicketToDto(t, now)).collect(Collectors.toList());
    }

    @Transactional
    public KitchenTicketDto updateTicketStatus(UUID ticketId, KitchenTicketStatus newStatus) {
        KitchenTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Kitchen ticket not found with id: " + ticketId));

        ticket.setStatus(newStatus);

        // If bumped to READY or COMPLETED, cascade to ticket items
        if (newStatus == KitchenTicketStatus.READY || newStatus == KitchenTicketStatus.COMPLETED) {
            TabItemStatus targetItemStatus = (newStatus == KitchenTicketStatus.READY)
                    ? TabItemStatus.READY
                    : TabItemStatus.SERVED;

            for (KitchenTicketItem item : ticket.getItems()) {
                if (item.getStatus() != TabItemStatus.VOID) {
                    item.setStatus(targetItemStatus);
                    ticketItemRepository.save(item);

                    if (item.getTabItem() != null) {
                        item.getTabItem().setStatus(targetItemStatus);
                        tabItemRepository.save(item.getTabItem());
                    }
                }
            }
        }

        KitchenTicket saved = ticketRepository.save(ticket);
        KitchenTicketDto dto = mapTicketToDto(saved, Instant.now());

        broadcastEvent("TICKET_STATUS_CHANGED", dto, saved.getStation());
        return dto;
    }

    @Transactional
    public KitchenTicketItemDto updateItemStatus(UUID ticketItemId, TabItemStatus newStatus) {
        KitchenTicketItem item = ticketItemRepository.findById(ticketItemId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket item not found with id: " + ticketItemId));

        item.setStatus(newStatus);
        KitchenTicketItem savedItem = ticketItemRepository.save(item);

        if (item.getTabItem() != null) {
            item.getTabItem().setStatus(newStatus);
            tabItemRepository.save(item.getTabItem());
        }

        // Auto-update parent ticket status if all items are READY or PREPARING
        KitchenTicket ticket = item.getTicket();
        if (ticket != null) {
            List<KitchenTicketItem> allItems = ticketItemRepository.findAllByTicketId(ticket.getId());
            boolean allReadyOrVoid = allItems.stream()
                    .allMatch(i -> i.getStatus() == TabItemStatus.READY || i.getStatus() == TabItemStatus.VOID || i.getStatus() == TabItemStatus.SERVED);
            boolean anyPreparing = allItems.stream()
                    .anyMatch(i -> i.getStatus() == TabItemStatus.PREPARING);

            if (allReadyOrVoid && ticket.getStatus() != KitchenTicketStatus.READY) {
                ticket.setStatus(KitchenTicketStatus.READY);
                ticketRepository.save(ticket);
                broadcastEvent("TICKET_READY", mapTicketToDto(ticket, Instant.now()), ticket.getStation());
            } else if (anyPreparing && ticket.getStatus() == KitchenTicketStatus.NEW) {
                ticket.setStatus(KitchenTicketStatus.PREPARING);
                ticketRepository.save(ticket);
            }
        }

        KitchenTicketItemDto dto = KitchenTicketItemDto.builder()
                .id(savedItem.getId())
                .tabItemId(savedItem.getTabItem() != null ? savedItem.getTabItem().getId() : null)
                .itemName(savedItem.getItemName())
                .qty(savedItem.getQty())
                .modifiers(savedItem.getModifiers())
                .notes(savedItem.getNotes())
                .status(savedItem.getStatus())
                .build();

        broadcastEvent("ITEM_STATUS_CHANGED", dto, ticket != null ? ticket.getStation() : null);
        return dto;
    }

    public KitchenTicketDto mapTicketToDto(KitchenTicket t, Instant now) {
        long elapsed = Duration.between(t.getCreatedAt(), now).toMinutes();

        List<KitchenTicketItemDto> itemDtos = t.getItems().stream().map(i -> KitchenTicketItemDto.builder()
                .id(i.getId())
                .tabItemId(i.getTabItem() != null ? i.getTabItem().getId() : null)
                .itemName(i.getItemName())
                .qty(i.getQty())
                .modifiers(i.getModifiers())
                .notes(i.getNotes())
                .status(i.getStatus())
                .build()
        ).collect(Collectors.toList());

        return KitchenTicketDto.builder()
                .id(t.getId())
                .ticketNumber(t.getTicketNumber())
                .tabId(t.getTab().getId())
                .tabNumber(t.getTab().getTabNumber())
                .tableId(t.getTable() != null ? t.getTable().getId() : null)
                .tableLabel(t.getTableLabel() != null ? t.getTableLabel() : (t.getTable() != null ? t.getTable().getLabel() : "Bar / Counter"))
                .station(t.getStation())
                .status(t.getStatus())
                .orderNotes(t.getOrderNotes())
                .createdAt(t.getCreatedAt())
                .elapsedMinutes(Math.max(0, elapsed))
                .items(itemDtos)
                .build();
    }
}
