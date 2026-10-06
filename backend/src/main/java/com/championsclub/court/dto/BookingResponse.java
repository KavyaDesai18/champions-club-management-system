package com.championsclub.court.dto;

import com.championsclub.court.domain.BookingStatus;
import com.championsclub.court.domain.SportType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
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
    private SportType sportType;
    private UUID userId;
    private String userName;
    private Instant startTime;
    private Instant endTime;
    private BookingStatus status;
    private BigDecimal totalAmount;
    private String tierApplied;
    private Instant createdAt;
}
