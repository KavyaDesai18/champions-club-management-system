package com.championsclub.member.dto;

import com.championsclub.member.domain.MembershipEvent;
import lombok.Builder;
import lombok.Value;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Value
@Builder
public class MembershipEventDto {
    UUID id;
    UUID membershipId;
    String eventType;
    String fromStatus;
    String toStatus;
    LocalDate effectiveDate;
    String actor;
    String reason;
    String metadataJson;
    Instant createdAt;

    public static MembershipEventDto fromEntity(MembershipEvent e) {
        return MembershipEventDto.builder()
                .id(e.getId())
                .membershipId(e.getMembership() != null ? e.getMembership().getId() : null)
                .eventType(e.getEventType() != null ? e.getEventType().name() : null)
                .fromStatus(e.getFromStatus())
                .toStatus(e.getToStatus())
                .effectiveDate(e.getEffectiveDate())
                .actor(e.getActor())
                .reason(e.getReason())
                .metadataJson(e.getMetadataJson())
                .createdAt(e.getCreatedAt())
                .build();
    }
}
