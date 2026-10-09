package com.championsclub.reporting.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HeatmapCellDto {
    private int dayOfWeek; // 1 = Monday, 7 = Sunday
    private String dayName; // Mon, Tue, etc.
    private int hour; // 6 to 22 (06:00 to 22:00)
    private long bookingCount;
    private double intensity; // 0.0 to 1.0 for heatmap rendering
}
