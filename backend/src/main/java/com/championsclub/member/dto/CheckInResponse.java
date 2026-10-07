package com.championsclub.member.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Value
@Builder
public class CheckInResponse {
    UUID memberId;
    String memberNo;
    String fullName;
    String photoUrl;
    String statusBanner; // ACTIVE, EXPIRING_SOON, EXPIRED, SUSPENDED
    Integer daysLeft;
    LocalDate endDate;
    String planCode;
    String planName;
    BigDecimal walletBalance;
    Integer guestPassesRemaining;
    Instant checkedInAt;
    String message;
    boolean duplicate;
    Instant previousCheckInAt;
}
