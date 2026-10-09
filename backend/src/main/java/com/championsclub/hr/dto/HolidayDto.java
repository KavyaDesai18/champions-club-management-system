package com.championsclub.hr.dto;

import com.championsclub.hr.domain.Holiday;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HolidayDto {
    private UUID id;
    private LocalDate holidayDate;
    private String name;
    private boolean isOptional;

    public static HolidayDto fromEntity(Holiday h) {
        if (h == null) return null;
        return HolidayDto.builder()
                .id(h.getId())
                .holidayDate(h.getHolidayDate())
                .name(h.getName())
                .isOptional(h.isOptional())
                .build();
    }
}
