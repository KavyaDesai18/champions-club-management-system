package com.championsclub.reporting.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OperationsKpisDto {
    private String preset;
    private LocalDate startDate;
    private LocalDate endDate;

    private CourtUtilizationDto courtUtilization;
    private List<HeatmapCellDto> peakHoursHeatmap;
    private MembershipKpiDto membershipKpi;
    private List<TopProductDto> topProducts;
    private List<LowStockItemDto> lowStockList;
    private BarKpiDto barKpi;
    private LeadFunnelDto leadFunnel;
}
