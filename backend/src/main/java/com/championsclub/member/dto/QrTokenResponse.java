package com.championsclub.member.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
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
    private String phone;
    private String email;
    private String planCode;
    private String planName;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;
    private Instant expiresAt;
    private List<String> benefits;
    private List<BookedSlotDto> bookedSlots;
    private String qrDataUrl; // Rendered base64 SVG or PNG for direct display
    private String qrPayload; // JSON string payload encoded in QR code
}
