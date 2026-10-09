package com.championsclub.hr.service;

import com.championsclub.common.error.BadRequestException;
import com.championsclub.common.error.ConflictException;
import com.championsclub.common.error.ForbiddenException;
import com.championsclub.common.security.Role;
import com.championsclub.hr.domain.*;
import com.championsclub.hr.dto.*;
import com.championsclub.hr.repo.*;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HrPayrollUnitTest {

    @Mock
    private PayrollRunRepository payrollRunRepository;
    @Mock
    private PayslipRepository payslipRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private AttendanceRecordRepository attendanceRecordRepository;
    @Mock
    private LeaveRequestRepository leaveRequestRepository;
    @Mock
    private LeaveBalanceRepository leaveBalanceRepository;
    @Mock
    private LeaveTypeRepository leaveTypeRepository;
    @Mock
    private RosterShiftRepository rosterShiftRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private HolidayRepository holidayRepository;
    @Mock
    private JdbcTemplate jdbcTemplate;

    @Captor
    private ArgumentCaptor<List<Payslip>> payslipsCaptor;

    private Clock fixedClock;
    private PayrollService payrollService;
    private LeaveService leaveService;
    private AttendanceService attendanceService;

    @BeforeEach
    void setUp() {
        fixedClock = Clock.fixed(Instant.parse("2026-06-15T10:00:00Z"), ZoneId.of("Asia/Kolkata"));

        payrollService = new PayrollService(
                payrollRunRepository,
                payslipRepository,
                employeeRepository,
                attendanceRecordRepository,
                leaveRequestRepository,
                userRepository,
                fixedClock,
                jdbcTemplate
        );

        LeaveCalculator leaveCalculator = new LeaveCalculator();
        leaveService = new LeaveService(
                leaveRequestRepository,
                leaveBalanceRepository,
                leaveTypeRepository,
                holidayRepository,
                employeeRepository,
                rosterShiftRepository,
                userRepository,
                leaveCalculator,
                fixedClock
        );

        attendanceService = new AttendanceService(
                attendanceRecordRepository,
                employeeRepository,
                userRepository,
                fixedClock,
                "Asia/Kolkata"
        );
    }

    // -------------------------------------------------------------
    // 1. Table-driven Proration & Payroll Tests
    // -------------------------------------------------------------

    @ParameterizedTest(name = "Join {0}, Exit {1} in Month {2}/{3} -> activeDays={4}, expectedFactor={5}")
    @CsvSource({
            // Join on 31st Jan: 1 day active out of 31 -> factor 0.0323
            "2026-01-31, 2099-12-31, 2026, 1, 1, 0.0323",
            // Exit on 15th Jan: 15 days active out of 31 -> factor 0.4839
            "2025-01-01, 2026-01-15, 2026, 1, 15, 0.4839",
            // Full month Jan: 31 days active out of 31 -> factor 1.0000
            "2025-01-01, 2099-12-31, 2026, 1, 31, 1.0000",
            // Mid-month join and mid-month exit in Feb (28 days): Feb 10 to Feb 20 -> 11 days -> factor 11/28 = 0.3929
            "2026-02-10, 2026-02-20, 2026, 2, 11, 0.3929"
    })
    @DisplayName("Table-driven proration factor calculation for mid-month join and exit")
    void testPayrollProrationTableDriven(
            String joinDateStr,
            String exitDateStr,
            int year,
            int month,
            long expectedActiveDays,
            String expectedFactorStr
    ) {
        YearMonth ym = YearMonth.of(year, month);
        int daysInMonth = ym.lengthOfMonth();
        LocalDate monthStart = ym.atDay(1);
        LocalDate monthEnd = ym.atEndOfMonth();

        LocalDate joinDate = LocalDate.parse(joinDateStr);
        LocalDate exitDate = LocalDate.parse(exitDateStr);

        LocalDate effectiveStart = joinDate.isAfter(monthStart) ? joinDate : monthStart;
        LocalDate effectiveEnd = exitDate.isBefore(monthEnd) ? exitDate : monthEnd;

        long activeDays = Math.max(0, effectiveEnd.toEpochDay() - effectiveStart.toEpochDay() + 1);
        BigDecimal factor = BigDecimal.valueOf(activeDays)
                .divide(BigDecimal.valueOf(daysInMonth), 4, RoundingMode.HALF_UP);

        assertThat(activeDays).isEqualTo(expectedActiveDays);
        assertThat(factor).isEqualByComparingTo(new BigDecimal(expectedFactorStr));
    }

    @Test
    @DisplayName("Payroll generation calculates prorated base, overtime (1.5x), allowances, and taxes")
    void testPayrollRunCalculation() {
        UUID managerUserId = UUID.randomUUID();
        User manager = User.builder().id(managerUserId).fullName("HR Manager").role(Role.MANAGER).build();
        when(userRepository.findById(managerUserId)).thenReturn(Optional.of(manager));

        Employee emp = Employee.builder()
                .id(UUID.randomUUID())
                .empNo("EMP-1001")
                .user(User.builder().id(UUID.randomUUID()).fullName("Alice Johnson").build())
                .joinDate(LocalDate.of(2026, 1, 1))
                .baseSalary(new BigDecimal("60000.00"))
                .hourlyRate(new BigDecimal("375.00"))
                .isDeleted(false)
                .build();

        when(payrollRunRepository.findByYearAndMonth(2026, 6)).thenReturn(Optional.empty());
        when(employeeRepository.findByIsDeletedFalseOrderByCreatedAtAsc()).thenReturn(List.of(emp));
        when(payrollRunRepository.save(any(PayrollRun.class))).thenAnswer(inv -> inv.getArgument(0));

        // Overtime: 10 hours
        AttendanceRecord att = AttendanceRecord.builder()
                .id(UUID.randomUUID())
                .workDate(LocalDate.of(2026, 6, 5))
                .overtimeHours(new BigDecimal("10.00"))
                .build();
        when(attendanceRecordRepository.findByEmployeeIdAndWorkDateBetweenOrderByWorkDateAsc(
                eq(emp.getId()), any(LocalDate.class), any(LocalDate.class)
        )).thenReturn(List.of(att));

        GeneratePayrollRequest req = GeneratePayrollRequest.builder()
                .year(2026)
                .month(6)
                .notes("June Payroll")
                .build();

        PayrollRunDto result = payrollService.generatePayroll(req, managerUserId);

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(PayrollRunStatus.DRAFT);
        assertThat(result.getPayslipsCount()).isEqualTo(1);

        verify(payslipRepository).saveAll(payslipsCaptor.capture());
        List<Payslip> savedSlips = payslipsCaptor.getValue();
        assertThat(savedSlips).hasSize(1);
        Payslip slip = savedSlips.get(0);

        // Base salary = 60,000.00, factor = 1.0000
        // Overtime: 10 hrs * (375.00 * 1.5) = 10 * 562.50 = 5,625.00
        // Allowances: 1,500.00
        // Gross: 60,000 + 5,625 + 1,500 = 67,125.00
        assertThat(slip.getGrossPay()).isEqualByComparingTo(new BigDecimal("67125.00"));
        // TDS (10% because gross > 50,000) = 6,712.50
        assertThat(slip.getTaxDeduction()).isEqualByComparingTo(new BigDecimal("6712.50"));
        // Professional tax = 200.00
        assertThat(slip.getOtherDeductions()).isEqualByComparingTo(new BigDecimal("200.00"));
        // Total deductions = 6,712.50 + 200.00 = 6,912.50
        assertThat(slip.getTotalDeductions()).isEqualByComparingTo(new BigDecimal("6912.50"));
        // Net = 67,125.00 - 6,912.50 = 60,212.50
        assertThat(slip.getNetPay()).isEqualByComparingTo(new BigDecimal("60212.50"));
    }

    // -------------------------------------------------------------
    // 2. Locked Payroll Protection
    // -------------------------------------------------------------

    @Test
    @DisplayName("Recalculating locked payroll (APPROVED or PAID) must throw ConflictException")
    void testRecalculatingLockedPayrollDenied() {
        UUID managerUserId = UUID.randomUUID();
        User manager = User.builder().id(managerUserId).fullName("HR Manager").role(Role.MANAGER).build();
        when(userRepository.findById(managerUserId)).thenReturn(Optional.of(manager));

        PayrollRun lockedRun = PayrollRun.builder()
                .id(UUID.randomUUID())
                .year(2026)
                .month(6)
                .status(PayrollRunStatus.APPROVED)
                .build();
        when(payrollRunRepository.findByYearAndMonth(2026, 6)).thenReturn(Optional.of(lockedRun));

        GeneratePayrollRequest req = GeneratePayrollRequest.builder().year(2026).month(6).build();

        assertThatThrownBy(() -> payrollService.generatePayroll(req, managerUserId))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("is locked with status APPROVED");
    }

    @Test
    @DisplayName("Reverting an APPROVED or PAID payroll to DRAFT must throw ConflictException")
    void testRevertingLockedPayrollDenied() {
        UUID runId = UUID.randomUUID();
        UUID managerUserId = UUID.randomUUID();
        User manager = User.builder().id(managerUserId).role(Role.MANAGER).build();
        when(userRepository.findById(managerUserId)).thenReturn(Optional.of(manager));

        PayrollRun approvedRun = PayrollRun.builder()
                .id(runId)
                .runNumber("PR-2026-06-0001")
                .status(PayrollRunStatus.APPROVED)
                .build();
        when(payrollRunRepository.findById(runId)).thenReturn(Optional.of(approvedRun));

        UpdatePayrollStatusRequest req = UpdatePayrollStatusRequest.builder()
                .status(PayrollRunStatus.DRAFT)
                .build();

        assertThatThrownBy(() -> payrollService.updatePayrollStatus(runId, req, managerUserId))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Locked payroll edits denied");
    }

    // -------------------------------------------------------------
    // 3. Leave Rules: Balances, Overlaps & Self-Approval
    // -------------------------------------------------------------

    @Test
    @DisplayName("Applying for leave with insufficient balance throws BadRequestException")
    void testInsufficientLeaveBalanceRejected() {
        UUID empUserId = UUID.randomUUID();
        UUID empId = UUID.randomUUID();
        Employee emp = Employee.builder().id(empId).user(User.builder().id(empUserId).build()).build();
        when(employeeRepository.findByUserId(empUserId)).thenReturn(Optional.of(emp));

        // Balance has only 1 day remaining
        LeaveBalance balance = LeaveBalance.builder()
                .employee(emp)
                .leaveTypeCode("CASUAL")
                .year(2026)
                .allocatedDays(new BigDecimal("12.0"))
                .usedDays(new BigDecimal("11.0"))
                .pendingDays(BigDecimal.ZERO)
                .remainingDays(new BigDecimal("1.0"))
                .build();
        when(leaveBalanceRepository.findByEmployeeIdAndLeaveTypeCodeAndYear(empId, "CASUAL", 2026))
                .thenReturn(Optional.of(balance));

        // Request 3 days (Mon to Wed)
        ApplyLeaveRequest req = ApplyLeaveRequest.builder()
                .leaveTypeCode("CASUAL")
                .startDate(LocalDate.of(2026, 6, 8))
                .endDate(LocalDate.of(2026, 6, 10))
                .reason("Personal trip")
                .build();

        assertThatThrownBy(() -> leaveService.applyLeave(req, empUserId))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Insufficient leave balance");
    }

    @Test
    @DisplayName("Applying for leave overlapping an existing leave throws ConflictException")
    void testOverlappingLeaveRequestRejected() {
        UUID empUserId = UUID.randomUUID();
        UUID empId = UUID.randomUUID();
        Employee emp = Employee.builder().id(empId).user(User.builder().id(empUserId).build()).build();
        when(employeeRepository.findByUserId(empUserId)).thenReturn(Optional.of(emp));

        // Existing overlapping leave
        LeaveRequest existing = LeaveRequest.builder()
                .id(UUID.randomUUID())
                .startDate(LocalDate.of(2026, 6, 8))
                .endDate(LocalDate.of(2026, 6, 10))
                .status(LeaveRequestStatus.PENDING)
                .build();
        when(leaveRequestRepository.findOverlappingRequests(eq(empId), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.of(existing));

        ApplyLeaveRequest req = ApplyLeaveRequest.builder()
                .leaveTypeCode("SICK")
                .startDate(LocalDate.of(2026, 6, 9))
                .endDate(LocalDate.of(2026, 6, 11))
                .reason("Medical checkup")
                .build();

        assertThatThrownBy(() -> leaveService.applyLeave(req, empUserId))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("overlapping");
    }

    @Test
    @DisplayName("Manager attempting to approve their own leave request must be denied with ForbiddenException")
    void testSelfApprovalProhibited() {
        UUID managerUserId = UUID.randomUUID();
        UUID leaveId = UUID.randomUUID();

        User managerUser = User.builder().id(managerUserId).role(Role.MANAGER).build();
        Employee managerEmp = Employee.builder().id(UUID.randomUUID()).user(managerUser).build();

        when(userRepository.findById(managerUserId)).thenReturn(Optional.of(managerUser));

        LeaveRequest selfLeave = LeaveRequest.builder()
                .id(leaveId)
                .employee(managerEmp)
                .status(LeaveRequestStatus.PENDING)
                .totalDays(new BigDecimal("2.0"))
                .build();
        when(leaveRequestRepository.findById(leaveId)).thenReturn(Optional.of(selfLeave));

        ReviewLeaveRequest req = ReviewLeaveRequest.builder()
                .status(LeaveRequestStatus.APPROVED)
                .comment("Self approval attempt")
                .build();

        // When reviewerUserId equals managerEmp.getUser().getId() -> must throw ForbiddenException
        assertThatThrownBy(() -> leaveService.reviewLeave(leaveId, req, managerUserId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("cannot review or approve their own leave");
    }

    // -------------------------------------------------------------
    // 4. Attendance: Double Clock-In & Overnight Shifts
    // -------------------------------------------------------------

    @Test
    @DisplayName("Double clock-in prevention: clocking in when already clocked in throws ConflictException")
    void testDoubleClockInPrevention() {
        UUID staffUserId = UUID.randomUUID();
        UUID empId = UUID.randomUUID();
        Employee emp = Employee.builder().id(empId).user(User.builder().id(staffUserId).build()).build();
        when(employeeRepository.findByUserId(staffUserId)).thenReturn(Optional.of(emp));

        // Existing open session
        AttendanceRecord openRecord = AttendanceRecord.builder()
                .id(UUID.randomUUID())
                .employee(emp)
                .workDate(LocalDate.of(2026, 6, 15))
                .clockIn(Instant.parse("2026-06-15T09:00:00Z"))
                .status(AttendanceStatus.PRESENT)
                .build();
        when(attendanceRecordRepository.findActiveClockInForEmployee(empId))
                .thenReturn(Optional.of(openRecord));

        ClockInRequest req = ClockInRequest.builder().source(AttendanceSource.WEB_CONSOLE).build();

        assertThatThrownBy(() -> attendanceService.clockIn(req, staffUserId))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Active attendance session already in progress");
    }

    @Test
    @DisplayName("Overnight shift clock-out attributes standard and overtime hours to initial workDate")
    void testOvernightShiftAttribution() {
        UUID staffUserId = UUID.randomUUID();
        UUID empId = UUID.randomUUID();
        Employee emp = Employee.builder().id(empId).user(User.builder().id(staffUserId).build()).build();
        when(employeeRepository.findById(empId)).thenReturn(Optional.of(emp));

        // Started 10 hours ago (e.g. 2026-06-15T00:00:00Z)
        Instant clockInTime = Instant.parse("2026-06-15T00:00:00Z");
        AttendanceRecord openSession = AttendanceRecord.builder()
                .id(UUID.randomUUID())
                .employee(emp)
                .workDate(LocalDate.of(2026, 6, 14)) // Overnight start day
                .clockIn(clockInTime)
                .status(AttendanceStatus.PRESENT)
                .build();
        when(attendanceRecordRepository.findActiveClockInForEmployee(empId))
                .thenReturn(Optional.of(openSession));
        when(attendanceRecordRepository.save(any(AttendanceRecord.class))).thenAnswer(inv -> inv.getArgument(0));

        // Current fixed clock is 2026-06-15T10:00:00Z (exactly 10.00 hours elapsed)
        ClockOutRequest req = ClockOutRequest.builder().employeeId(empId).build();
        AttendanceRecordDto result = attendanceService.clockOut(req, staffUserId);

        assertThat(result.getWorkDate()).isEqualTo(LocalDate.of(2026, 6, 14));
        assertThat(result.getTotalHours()).isEqualByComparingTo(new BigDecimal("10.00"));
        assertThat(result.getOvertimeHours()).isEqualByComparingTo(new BigDecimal("2.00"));
    }

    @Test
    @DisplayName("Payroll generation is idempotent for DRAFT run, recalculating without duplicating records")
    void testPayrollGenerationIdempotentForDraftRun() {
        UUID managerUserId = UUID.randomUUID();
        User manager = User.builder().id(managerUserId).fullName("HR Manager").role(Role.MANAGER).build();
        when(userRepository.findById(managerUserId)).thenReturn(Optional.of(manager));

        PayrollRun existingDraft = PayrollRun.builder()
                .id(UUID.randomUUID())
                .runNumber("PR-2026-06-0001")
                .year(2026)
                .month(6)
                .status(PayrollRunStatus.DRAFT)
                .payslips(new java.util.ArrayList<>())
                .build();
        when(payrollRunRepository.findByYearAndMonth(2026, 6)).thenReturn(Optional.of(existingDraft));
        when(employeeRepository.findByIsDeletedFalseOrderByCreatedAtAsc()).thenReturn(Collections.emptyList());
        when(payrollRunRepository.save(any(PayrollRun.class))).thenAnswer(inv -> inv.getArgument(0));

        GeneratePayrollRequest req = GeneratePayrollRequest.builder().year(2026).month(6).build();
        PayrollRunDto result = payrollService.generatePayroll(req, managerUserId);

        assertThat(result.getRunNumber()).isEqualTo("PR-2026-06-0001");
        assertThat(result.getStatus()).isEqualTo(PayrollRunStatus.DRAFT);
        verify(payslipRepository).deleteAll(any());
    }
}

