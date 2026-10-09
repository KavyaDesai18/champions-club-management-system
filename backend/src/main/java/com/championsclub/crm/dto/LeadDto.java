package com.championsclub.crm.dto;

import com.championsclub.crm.domain.LeadSource;
import com.championsclub.crm.domain.LeadStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeadDto {

    private UUID id;
    private String name;
    private String email;
    private String phone;
    private LeadSource source;
    private String interest;
    private String message;
    private LeadStatus status;
    private UUID assignedToId;
    private String assignedToName;
    private Instant followUpAt;
    private String lostReason;
    private Boolean consent;
    private UUID convertedMemberId;
    private String convertedMemberNo;
    private UUID corporateAccountId;
    private Instant createdAt;
    private Instant updatedAt;
    private boolean overdue;
    private List<LeadActivityDto> activities;
    private List<QuoteDto> quotes;
}
