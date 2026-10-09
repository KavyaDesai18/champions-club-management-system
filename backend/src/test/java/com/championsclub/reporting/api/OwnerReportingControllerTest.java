package com.championsclub.reporting.api;

import com.championsclub.common.error.GlobalExceptionHandler;
import com.championsclub.common.security.JwtAuthenticationFilter;
import com.championsclub.common.security.JwtTokenProvider;
import com.championsclub.common.security.SecurityConfig;
import com.championsclub.member.repo.UserRepository;
import com.championsclub.reporting.domain.DateRangePreset;
import com.championsclub.reporting.domain.ReportType;
import com.championsclub.reporting.dto.*;
import com.championsclub.reporting.service.ReportExportService;
import com.championsclub.reporting.service.ReportShareService;
import com.championsclub.reporting.service.ReportingService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {OwnerReportingController.class, PublicReportShareController.class})
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
class OwnerReportingControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private ReportingService reportingService;
    @MockBean private ReportExportService reportExportService;
    @MockBean private ReportShareService reportShareService;
    @MockBean private JwtTokenProvider jwtTokenProvider;
    @MockBean private UserRepository userRepository;
    @MockBean private java.time.Clock clock;

    @Test
    @WithMockUser(roles = "OWNER")
    @DisplayName("Owner can fetch financial summary successfully")
    void testGetFinancialSummaryOwner() throws Exception {
        FinancialSummaryDto mockSummary = FinancialSummaryDto.builder()
                .preset("THIS_MONTH")
                .totalRevenue(new BigDecimal("22000.00"))
                .netPosition(new BigDecimal("5000.00"))
                .totalReceivables(new BigDecimal("3000.00"))
                .totalPayables(new BigDecimal("15000.00"))
                .build();

        when(reportingService.getFinancialSummary(any(), any(), any())).thenReturn(mockSummary);

        mockMvc.perform(get("/api/v1/reporting/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRevenue").value(22000.00))
                .andExpect(jsonPath("$.netPosition").value(5000.00));
    }

    @Test
    @WithMockUser(roles = "FRONT_DESK")
    @DisplayName("Front desk is forbidden from viewing owner financial summary")
    void testFrontDeskForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/reporting/summary"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "MANAGER")
    @DisplayName("Manager can export CSV report with correct Content-Disposition attachment header")
    void testExportCsv() throws Exception {
        byte[] csvBytes = "Date,Stream,Amount\n2026-10-01,COURTS,5000".getBytes();
        when(reportExportService.exportReport(any(), eq("CSV"), any(), any(), any())).thenReturn(csvBytes);
        when(reportExportService.getFilename(any(), eq("CSV"), any(), any())).thenReturn("report.csv");

        mockMvc.perform(get("/api/v1/reporting/export?format=CSV&reportType=REVENUE"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"report.csv\""))
                .andExpect(content().bytes(csvBytes));
    }

    @Test
    @WithMockUser(roles = "OWNER")
    @DisplayName("Owner can create shareable read-only link")
    void testCreateShare() throws Exception {
        CreateReportShareRequest req = CreateReportShareRequest.builder()
                .title("Q3 Summary for Investors")
                .reportType(ReportType.FINANCIAL_SUMMARY)
                .preset(DateRangePreset.THIS_MONTH)
                .expireInHours(48)
                .build();

        ReportShareResponse res = ReportShareResponse.builder()
                .id(UUID.randomUUID())
                .shareToken("tok_xyz123")
                .title("Q3 Summary for Investors")
                .shareUrl("http://localhost:5173/shared-report/tok_xyz123")
                .expiresAt(Instant.now().plusSeconds(86400))
                .build();

        when(reportShareService.createShare(any(), any())).thenReturn(res);

        mockMvc.perform(post("/api/v1/reporting/share")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shareToken").value("tok_xyz123"))
                .andExpect(jsonPath("$.title").value("Q3 Summary for Investors"));
    }

    @Test
    @DisplayName("Public user can view shared report without login")
    void testPublicSharedReportView() throws Exception {
        FinancialSummaryDto summary = FinancialSummaryDto.builder()
                .totalRevenue(new BigDecimal("18500.00"))
                .netPosition(new BigDecimal("4200.00"))
                .build();

        when(reportShareService.getSharedReportData("tok_xyz123")).thenReturn(summary);

        mockMvc.perform(get("/api/v1/public/reports/share/tok_xyz123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRevenue").value(18500.00))
                .andExpect(jsonPath("$.netPosition").value(4200.00));
    }
}
