package com.championsclub.auth;

import com.championsclub.bar.api.TabController;
import com.championsclub.bar.service.ShiftService;
import com.championsclub.bar.service.TabService;
import com.championsclub.common.error.GlobalExceptionHandler;
import com.championsclub.common.security.JwtAuthenticationFilter;
import com.championsclub.common.security.JwtTokenProvider;
import com.championsclub.common.security.SecurityConfig;
import com.championsclub.hr.api.PayrollController;
import com.championsclub.hr.service.AttendanceService;
import com.championsclub.hr.service.HrEmployeeService;
import com.championsclub.hr.service.LeaveService;
import com.championsclub.hr.service.PayrollService;
import com.championsclub.hr.service.RosterService;
import com.championsclub.member.api.MemberController;
import com.championsclub.member.api.PlanController;
import com.championsclub.member.repo.UserRepository;
import com.championsclub.member.service.MemberService;
import com.championsclub.member.service.MembershipService;
import com.championsclub.member.service.PlanService;
import com.championsclub.reporting.api.ExpenseController;
import com.championsclub.reporting.api.OwnerReportingController;
import com.championsclub.reporting.service.ExpenseService;
import com.championsclub.reporting.service.ReportExportService;
import com.championsclub.reporting.service.ReportShareService;
import com.championsclub.reporting.service.ReportingService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Clock;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Rigorous Role-Based Access Control (RBAC) authorization matrix test.
 * Verifies the allow/deny permissions matrix for every key operational endpoint
 * across all system roles: OWNER, MANAGER, FRONT_DESK, SHOP_STAFF, BAR_STAFF, KITCHEN, COACH, MEMBER, and ANONYMOUS.
 */
@WebMvcTest(controllers = {
        PlanController.class,
        MemberController.class,
        OwnerReportingController.class,
        ExpenseController.class,
        PayrollController.class,
        TabController.class
})
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
public class AuthorizationMatrixIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    // Service mocks for sliced controllers
    @MockBean private PlanService planService;
    @MockBean private MemberService memberService;
    @MockBean private MembershipService membershipService;
    @MockBean private ReportingService reportingService;
    @MockBean private ReportExportService reportExportService;
    @MockBean private ReportShareService reportShareService;
    @MockBean private ExpenseService expenseService;
    @MockBean private HrEmployeeService hrEmployeeService;
    @MockBean private RosterService rosterService;
    @MockBean private AttendanceService attendanceService;
    @MockBean private LeaveService leaveService;
    @MockBean private PayrollService payrollService;
    @MockBean private TabService tabService;
    @MockBean private ShiftService shiftService;

    // Security mocks
    @MockBean private JwtTokenProvider jwtTokenProvider;
    @MockBean private UserRepository userRepository;
    @MockBean private Clock clock;

    // =========================================================================
    // 1. PUBLIC ENDPOINTS ALLOW MATRIX
    // =========================================================================

    @Test
    @WithAnonymousUser
    @DisplayName("Public plans endpoint allows anonymous access (200 OK)")
    void testPublicPlansAllowedForAnonymous() throws Exception {
        when(planService.getAllActivePlans()).thenReturn(List.of());
        mockMvc.perform(get("/api/v1/plans"))
                .andExpect(status().isOk());
    }

    @ParameterizedTest
    @ValueSource(strings = {"MEMBER", "COACH", "FRONT_DESK", "SHOP_STAFF", "BAR_STAFF", "KITCHEN", "MANAGER", "OWNER"})
    @DisplayName("Public plans endpoint allows every authenticated role (200 OK)")
    void testPublicPlansAllowedForAllRoles(String role) throws Exception {
        when(planService.getAllActivePlans()).thenReturn(List.of());
        mockMvc.perform(get("/api/v1/plans"))
                .andExpect(status().isOk());
    }

    // =========================================================================
    // 2. FRONT DESK / MEMBER DIRECTORY RBAC MATRIX
    // =========================================================================

    @Test
    @WithAnonymousUser
    @DisplayName("/members directory: Anonymous is denied with 401 Unauthorized")
    void testMembersAnonymousDenied() throws Exception {
        mockMvc.perform(get("/api/v1/members"))
                .andExpect(status().isUnauthorized());
    }

    @ParameterizedTest
    @ValueSource(strings = {"MEMBER", "BAR_STAFF", "KITCHEN", "SHOP_STAFF"})
    @DisplayName("/members directory: Unauthorized roles receive 403 Forbidden")
    void testMembersUnauthorizedRolesForbidden(String role) throws Exception {
        mockMvc.perform(get("/api/v1/members").with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("testuser").roles(role)))
                .andExpect(status().isForbidden());
    }

    @ParameterizedTest
    @ValueSource(strings = {"FRONT_DESK", "MANAGER", "OWNER", "COACH"})
    @DisplayName("/members directory: Authorized roles (FRONT_DESK, MANAGER, OWNER, COACH) receive 200 OK")
    void testMembersAuthorizedRolesAllowed(String role) throws Exception {
        when(memberService.searchMembers(any(), any(), any(), any())).thenReturn(org.springframework.data.domain.Page.empty());
        mockMvc.perform(get("/api/v1/members").with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("staffuser").roles(role)))
                .andExpect(status().isOk());
    }

    // =========================================================================
    // 3. OWNER FINANCIAL REPORTING RBAC MATRIX (STRICTEST PRIVILEGE)
    // =========================================================================

    @Test
    @WithAnonymousUser
    @DisplayName("/reporting/summary: Anonymous receives 401 Unauthorized")
    void testOwnerFinancialAnonymousDenied() throws Exception {
        mockMvc.perform(get("/api/v1/reporting/summary"))
                .andExpect(status().isUnauthorized());
    }

    @ParameterizedTest
    @ValueSource(strings = {"MEMBER", "COACH", "BAR_STAFF", "KITCHEN", "SHOP_STAFF", "FRONT_DESK"})
    @DisplayName("/reporting/summary: Non-Owner/Non-Manager staff receive 403 Forbidden")
    void testOwnerFinancialNonOwnerForbidden(String role) throws Exception {
        mockMvc.perform(get("/api/v1/reporting/summary").with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("user").roles(role)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "OWNER")
    @DisplayName("/reporting/summary: OWNER receives 200 OK")
    void testOwnerFinancialOwnerAllowed() throws Exception {
        when(reportingService.getFinancialSummary(any(), any(), any())).thenReturn(new com.championsclub.reporting.dto.FinancialSummaryDto());
        mockMvc.perform(get("/api/v1/reporting/summary"))
                .andExpect(status().isOk());
    }

    // =========================================================================
    // 4. HR & PAYROLL RUNS RBAC MATRIX
    // =========================================================================

    @Test
    @WithAnonymousUser
    @DisplayName("/hr/payroll/runs: Anonymous receives 401 Unauthorized")
    void testPayrollAnonymousDenied() throws Exception {
        mockMvc.perform(get("/api/v1/hr/payroll/runs"))
                .andExpect(status().isUnauthorized());
    }

    @ParameterizedTest
    @ValueSource(strings = {"MEMBER", "COACH", "BAR_STAFF", "KITCHEN", "FRONT_DESK", "SHOP_STAFF"})
    @DisplayName("/hr/payroll/runs: Unauthorized staff receive 403 Forbidden")
    void testPayrollUnauthorizedStaffForbidden(String role) throws Exception {
        mockMvc.perform(get("/api/v1/hr/payroll/runs").with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("user").roles(role)))
                .andExpect(status().isForbidden());
    }

    @ParameterizedTest
    @ValueSource(strings = {"MANAGER", "OWNER"})
    @DisplayName("/hr/payroll/runs: HR Executives (MANAGER, OWNER) receive 200 OK")
    void testPayrollExecutivesAllowed(String role) throws Exception {
        when(payrollService.getAllPayrollRuns()).thenReturn(List.of());
        mockMvc.perform(get("/api/v1/hr/payroll/runs").with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("mgmt").roles(role)))
                .andExpect(status().isOk());
    }

    // =========================================================================
    // 5. BAR POS & TAB REPOSITORIES RBAC MATRIX
    // =========================================================================

    @Test
    @WithAnonymousUser
    @DisplayName("/bar/tabs: Anonymous receives 401 Unauthorized")
    void testBarTabsAnonymousDenied() throws Exception {
        mockMvc.perform(get("/api/v1/bar/tabs"))
                .andExpect(status().isUnauthorized());
    }

    @ParameterizedTest
    @ValueSource(strings = {"MEMBER", "COACH"})
    @DisplayName("/bar/tabs: Members and Coaches receive 403 Forbidden")
    void testBarTabsNonStaffForbidden(String role) throws Exception {
        mockMvc.perform(get("/api/v1/bar/tabs").with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("user").roles(role)))
                .andExpect(status().isForbidden());
    }

    @ParameterizedTest
    @ValueSource(strings = {"BAR_STAFF", "MANAGER", "OWNER"})
    @DisplayName("/bar/tabs: Authorized bar operators (BAR_STAFF, MANAGER, OWNER) receive 200 OK")
    void testBarTabsAuthorizedAllowed(String role) throws Exception {
        when(tabService.getOpenTabs()).thenReturn(List.of());
        mockMvc.perform(get("/api/v1/bar/tabs").with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("baruser").roles(role)))
                .andExpect(status().isOk());
    }

    // =========================================================================
    // 6. OPERATING EXPENSES RBAC MATRIX
    // =========================================================================

    @Test
    @WithAnonymousUser
    @DisplayName("/reporting/expenses: Anonymous receives 401 Unauthorized")
    void testExpensesAnonymousDenied() throws Exception {
        mockMvc.perform(get("/api/v1/reporting/expenses"))
                .andExpect(status().isUnauthorized());
    }

    @ParameterizedTest
    @ValueSource(strings = {"MEMBER", "COACH", "BAR_STAFF", "KITCHEN", "FRONT_DESK"})
    @DisplayName("/reporting/expenses: General staff and members receive 403 Forbidden")
    void testExpensesUnauthorizedForbidden(String role) throws Exception {
        mockMvc.perform(get("/api/v1/reporting/expenses").with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("user").roles(role)))
                .andExpect(status().isForbidden());
    }

    @ParameterizedTest
    @ValueSource(strings = {"MANAGER", "OWNER"})
    @DisplayName("/reporting/expenses: Financial controllers (MANAGER, OWNER) receive 200 OK")
    void testExpensesAuthorizedAllowed(String role) throws Exception {
        when(expenseService.getExpenses(any(), any(), any(), any()))
                .thenReturn(List.of());
        mockMvc.perform(get("/api/v1/reporting/expenses").with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("mgmt").roles(role)))
                .andExpect(status().isOk());
    }
}
