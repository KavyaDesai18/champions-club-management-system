package com.championsclub.hr.api;

import com.championsclub.common.error.GlobalExceptionHandler;
import com.championsclub.common.security.JwtAuthenticationFilter;
import com.championsclub.common.security.JwtTokenProvider;
import com.championsclub.common.security.Role;
import com.championsclub.common.security.SecurityConfig;
import com.championsclub.hr.domain.LeaveRequestStatus;
import com.championsclub.hr.domain.PayrollRunStatus;
import com.championsclub.hr.dto.*;
import com.championsclub.hr.service.HrEmployeeService;
import com.championsclub.hr.service.LeaveService;
import com.championsclub.hr.service.PayrollService;
import com.championsclub.hr.service.RosterService;
import com.championsclub.hr.service.AttendanceService;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
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
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {PayrollController.class, LeaveController.class, HrEmployeeController.class})
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
class HrControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private PayrollService payrollService;

    @MockBean
    private LeaveService leaveService;

    @MockBean
    private HrEmployeeService employeeService;

    @MockBean
    private RosterService rosterService;

    @MockBean
    private AttendanceService attendanceService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private Clock clock;

    @BeforeEach
    void setUpFilter() throws Exception {
        org.mockito.Mockito.doAnswer(invocation -> {
            jakarta.servlet.http.HttpServletRequest req = invocation.getArgument(0);
            jakarta.servlet.http.HttpServletResponse res = invocation.getArgument(1);
            jakarta.servlet.FilterChain chain = invocation.getArgument(2);
            chain.doFilter(req, res);
            return null;
        }).when(jwtAuthenticationFilter).doFilter(any(), any(), any());

        when(clock.instant()).thenReturn(Instant.now());
    }

    // -------------------------------------------------------------
    // Access Matrix & Unauthenticated Tests
    // -------------------------------------------------------------

    @Test
    @DisplayName("GET /api/v1/hr/payroll/runs - unauthenticated access is rejected with 401")
    void testUnauthenticatedAccessRejected() throws Exception {
        mockMvc.perform(get("/api/v1/hr/payroll/runs"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "FRONT_DESK")
    @DisplayName("POST /api/v1/hr/payroll/runs - regular staff access denied with 403")
    void testStaffCannotGeneratePayroll() throws Exception {
        GeneratePayrollRequest req = GeneratePayrollRequest.builder()
                .year(2026)
                .month(6)
                .build();

        mockMvc.perform(post("/api/v1/hr/payroll/runs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "MANAGER")
    @DisplayName("GET /api/v1/hr/payroll/runs - manager can access payroll list")
    void testManagerCanViewPayrollRuns() throws Exception {
        PayrollRunDto run = PayrollRunDto.builder()
                .id(UUID.randomUUID())
                .runNumber("PR-2026-06-0001")
                .year(2026)
                .month(6)
                .status(PayrollRunStatus.DRAFT)
                .totalGross(new BigDecimal("150000.00"))
                .totalNet(new BigDecimal("132000.00"))
                .build();

        when(payrollService.getAllPayrollRuns()).thenReturn(List.of(run));

        mockMvc.perform(get("/api/v1/hr/payroll/runs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].runNumber").value("PR-2026-06-0001"))
                .andExpect(jsonPath("$[0].totalNet").value(132000.00));
    }

    @Test
    @WithMockUser(roles = "BAR_STAFF")
    @DisplayName("GET /api/v1/hr/payroll/runs - regular staff forbidden from viewing club payroll runs")
    void testStaffCannotViewAllPayrollRuns() throws Exception {
        mockMvc.perform(get("/api/v1/hr/payroll/runs"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "BAR_STAFF")
    @DisplayName("POST /api/v1/hr/leave/requests/{id}/review - regular staff cannot review leave requests")
    void testStaffCannotReviewLeaveRequests() throws Exception {
        ReviewLeaveRequest req = ReviewLeaveRequest.builder()
                .status(LeaveRequestStatus.APPROVED)
                .comment("Unauthorized attempt")
                .build();

        mockMvc.perform(post("/api/v1/hr/leave/requests/" + UUID.randomUUID() + "/review")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    // -------------------------------------------------------------
    // Working Days Calculation Endpoint
    // -------------------------------------------------------------

    @Test
    @WithMockUser(roles = "FRONT_DESK")
    @DisplayName("GET /api/v1/hr/leave/calculate - staff can preview working days calculation")
    void testCalculateWorkingDays() throws Exception {
        LeaveCalculationDto calc = LeaveCalculationDto.builder()
                .startDate(LocalDate.of(2026, 6, 8))
                .endDate(LocalDate.of(2026, 6, 12))
                .totalCalendarDays(5)
                .workingDaysCount(new BigDecimal("5.0"))
                .weekendsCount(0)
                .holidaysCount(0)
                .isValid(true)
                .build();

        when(leaveService.calculateLeave(any(LocalDate.class), any(LocalDate.class), eq(false)))
                .thenReturn(calc);

        mockMvc.perform(get("/api/v1/hr/leave/calculate")
                        .param("startDate", "2026-06-08")
                        .param("endDate", "2026-06-12")
                        .param("isHalfDay", "false"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.workingDaysCount").value(5.0))
                .andExpect(jsonPath("$.weekendsCount").value(0));
    }

    @Test
    @WithMockUser(roles = "OWNER")
    @DisplayName("PUT /api/v1/hr/payroll/runs/{id}/status - owner updates payroll status")
    void testOwnerUpdatesPayrollStatus() throws Exception {
        UUID runId = UUID.randomUUID();

        UpdatePayrollStatusRequest req = UpdatePayrollStatusRequest.builder()
                .status(PayrollRunStatus.APPROVED)
                .notes("Reviewed and approved by owner")
                .build();

        PayrollRunDto approvedDto = PayrollRunDto.builder()
                .id(runId)
                .runNumber("PR-2026-06-0001")
                .status(PayrollRunStatus.APPROVED)
                .build();

        when(payrollService.updatePayrollStatus(eq(runId), any(UpdatePayrollStatusRequest.class), any()))
                .thenReturn(approvedDto);

        mockMvc.perform(put("/api/v1/hr/payroll/runs/" + runId + "/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());
    }
}
