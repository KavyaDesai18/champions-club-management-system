package com.championsclub.bar.dto;

import com.championsclub.bar.domain.KitchenTicketStatus;
import com.championsclub.bar.domain.StationType;
import com.championsclub.bar.domain.TabItemStatus;
import lombok.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KitchenTicketDto {
    private UUID id;
    private String ticketNumber;
    private UUID tabId;
    private String tabNumber;
    private UUID tableId;
    private String tableLabel;
    private StationType station;
    private KitchenTicketStatus status;
    private String orderNotes;
    private Instant createdAt;
    private Long elapsedMinutes;
    private List<KitchenTicketItemDto> items;
}
