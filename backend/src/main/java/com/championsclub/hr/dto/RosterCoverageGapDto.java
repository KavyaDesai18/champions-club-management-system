package com.championsclub.hr.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RosterCoverageGapDto {
    private LocalDate date;
    private String department;
    private String role;
    private String station;
    private String warningMessage;
}
