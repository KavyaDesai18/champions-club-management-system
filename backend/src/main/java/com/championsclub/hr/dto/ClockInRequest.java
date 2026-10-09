package com.championsclub.hr.dto;

import com.championsclub.hr.domain.AttendanceSource;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClockInRequest {
    private UUID employeeId;
    @Builder.Default
    private AttendanceSource source = AttendanceSource.WEB_CONSOLE;
}
