package com.championsclub.member.dto;

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
public class QrTokenResponse {
    private String qrToken;
    private UUID memberId;
    private String memberNo;
    private String fullName;
    private String planCode;
    private String status;
    private Instant expiresAt;
    private String qrDataUrl; // Rendered base64 SVG or PNG for direct display
}
