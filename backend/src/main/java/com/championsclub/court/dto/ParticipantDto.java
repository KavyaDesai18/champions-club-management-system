package com.championsclub.court.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParticipantDto {
    private UUID id;
    private UUID memberId;
    private String memberName;
    private String memberNo;
    private String guestName;
    private String guestPhone;
    private boolean isGuest;
    private BigDecimal fee;
}
