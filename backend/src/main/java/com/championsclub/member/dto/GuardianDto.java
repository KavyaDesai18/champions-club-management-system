package com.championsclub.member.dto;

import com.championsclub.member.domain.Guardian;
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
public class GuardianDto {
    private UUID id;
    private String name;
    private String phone;
    private String relation;
    private Instant consentAt;

    public static GuardianDto fromEntity(Guardian guardian) {
        if (guardian == null) return null;
        return GuardianDto.builder()
                .id(guardian.getId())
                .name(guardian.getName())
                .phone(guardian.getPhone())
                .relation(guardian.getRelation())
                .consentAt(guardian.getConsentAt())
                .build();
    }
}
