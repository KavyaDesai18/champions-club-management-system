package com.championsclub.member.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Value
@Builder
public class CheckInResponse {
    UUID memberId;
    String memberNo;
    String fullName;
    String phone;
    String email;
    String photoUrl;
    String statusBanner; // ACTIVE, EXPIRING_SOON, EXPIRED, SUSPENDED
    Integer daysLeft;
    LocalDate startDate;
    LocalDate endDate;
    String planCode;
    String planName;
    List<String> benefits;
    List<BookedSlotDto> bookedSlots;
    BigDecimal walletBalance;
    Integer guestPassesRemaining;
    Instant checkedInAt;
    String message;
    boolean duplicate;
    Instant previousCheckInAt;
    Boolean hasUnsettledTabs;
    Integer unsettledTabsCount;
    BigDecimal unsettledTabsAmount;
}
