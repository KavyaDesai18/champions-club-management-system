package com.championsclub.crm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrialBookingConfirmationDto {

    private String bookingReference;
    private String courtName;
    private String sportName;
    private LocalDate date;
    private LocalTime startTime;
    private String guestName;
    private String guestPhone;
    private UUID leadId;
    private String message;
}
