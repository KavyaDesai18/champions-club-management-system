package com.championsclub.social.dto;

import com.championsclub.social.domain.AttendanceStatus;
import com.championsclub.social.domain.SocialParticipantStatus;
import com.championsclub.social.domain.SocialPaymentStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SocialParticipantResponse {

    private UUID id;
    private UUID sessionId;
    private UUID memberId;
    private String memberName;
    private String memberEmail;
    private String planCode;
    private String guestName;
    private String guestPhone;
    private SocialParticipantStatus status;
    private SocialPaymentStatus paymentStatus;
    private BigDecimal feePaid;
    private Instant joinedAt;
    private AttendanceStatus attendanceStatus;
}
