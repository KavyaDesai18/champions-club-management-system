package com.championsclub.member.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Member360Dto {

    private ProfileInfo profile;
    private PlanDto plan;
    private GuardianDto guardian;
    private EntitlementsInfo entitlements;
    private ValidityInfo validity;
    private List<BookingSummaryDto> recentBookings;
    private List<OrderSummaryDto> recentOrders;
    private List<WalletActivityDto> recentWalletActivity;
    private Boolean hasUnsettledTabs;
    private Long unsettledTabsCount;
    private BigDecimal unsettledTabsAmount;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProfileInfo {
        private UUID id;
        private String memberNo;
        private String fullName;
        private String email;
        private String phone;
        private LocalDate dob;
        private Integer age;
        private String gender;
        private String address;
        private String photoUrl;
        private String emergencyContact;
        private String notes;
        private String status;
        private LocalDate startDate;
        private LocalDate endDate;
        private BigDecimal walletBalance;
        private Integer guestPassesRemaining;
        private Boolean isMinor;
        private Boolean upgradeDue;
        private UUID userId;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EntitlementsInfo {
        private Integer advanceBookingDays;
        private BigDecimal courtDiscountPct;
        private BigDecimal shopDiscountPct;
        private BigDecimal barDiscountPct;
        private Boolean freeCourts;
        private Integer maxBookingsPerDay;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ValidityInfo {
        private long daysRemaining;
        private boolean isExpired;
        private boolean upgradeDue;
        private boolean canBook;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BookingSummaryDto {
        private String bookingReference;
        private String courtName;
        private String sportType;
        private String startTime;
        private String endTime;
        private String status;
        private BigDecimal totalAmount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderSummaryDto {
        private String orderNumber;
        private String category;
        private String description;
        private BigDecimal amount;
        private String date;
        private String status;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WalletActivityDto {
        private String transactionId;
        private String type;
        private BigDecimal amount;
        private BigDecimal balanceAfter;
        private String timestamp;
        private String note;
    }
}
