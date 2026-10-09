package com.championsclub.crm.dto;

import com.championsclub.crm.domain.LeadActivityType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeadActivityDto {

    private UUID id;
    private UUID leadId;
    private LeadActivityType type;
    private String details;
    private UUID performedById;
    private String performerName;
    private Instant createdAt;
}
