package com.championsclub.court.dto;

import com.championsclub.court.domain.BookingSource;
import jakarta.validation.constraints.NotNull;
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
public class CreateBookingRequest {

    @NotNull(message = "Court ID is required")
    private UUID courtId;

    private UUID userId;

    private UUID memberId;

    private String guestName;

    private String guestPhone;

    @NotNull(message = "Start time is required")
    private Instant startTime;

    private Instant endTime;

    @Builder.Default
    private BookingSource source = BookingSource.ONLINE;

    @Builder.Default
    private boolean isHold = true;

    private List<ParticipantDto> participants;

    private String staffOverrideReason;

    private boolean allowExpiredMemberWalkInRate;
}
