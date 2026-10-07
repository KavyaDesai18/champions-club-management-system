package com.championsclub.court.dto;

import com.championsclub.court.domain.BookingSource;
import com.championsclub.court.domain.BookingStatus;
import com.championsclub.court.domain.PaymentStatus;
import com.championsclub.court.domain.SportType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingResponse {
    private UUID id;
    private String bookingReference;
    private UUID courtId;
    private String courtName;
    private String sportName;
    private SportType sportType;

    private UUID userId;
    private String userName;

    private UUID memberId;
    private String memberNo;
    private String memberName;

    private String guestName;
    private String guestPhone;

    private Instant startTime;
    private Instant endTime;

    private BookingStatus status;
    private BookingSource source;

    private BigDecimal totalAmount;
    private BigDecimal price;
    private String tierApplied;
    private String planSnapshot;
    private PaymentStatus paymentStatus;

    private String idempotencyKey;
    private Instant holdExpiresAt;
    private Instant cancelledAt;
    private String cancelReason;

    private List<ParticipantDto> participants;

    // Linking suggestion if guest phone matches an existing member
    private UUID suggestedMemberId;
    private String suggestedMemberName;
    private String suggestedMemberNo;

    private Instant createdAt;
    private Instant updatedAt;
}
