package com.championsclub.notification.dto;

import com.championsclub.notification.domain.NotificationPreference;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationPreferenceDto {
    private boolean emailEnabled;
    private boolean smsEnabled;
    private boolean inAppEnabled;
    private boolean expiryReminders;
    private boolean bookingUpdates;
    private boolean marketingPromos;

    public static NotificationPreferenceDto fromEntity(NotificationPreference p) {
        return NotificationPreferenceDto.builder()
                .emailEnabled(p.isEmailEnabled())
                .smsEnabled(p.isSmsEnabled())
                .inAppEnabled(p.isInAppEnabled())
                .expiryReminders(p.isExpiryReminders())
                .bookingUpdates(p.isBookingUpdates())
                .marketingPromos(p.isMarketingPromos())
                .build();
    }
}
