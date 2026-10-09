package com.championsclub.hr.service;

import com.championsclub.common.error.ConflictException;
import com.championsclub.common.error.ForbiddenException;
import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.common.security.Role;
import com.championsclub.hr.domain.*;
import com.championsclub.hr.dto.GeneratePayrollRequest;
import com.championsclub.hr.dto.PayrollRunDto;
import com.championsclub.hr.dto.PayslipDto;
import com.championsclub.hr.dto.UpdatePayrollStatusRequest;
import com.championsclub.hr.repo.*;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Service
public class PayrollService {

    private static final Logger log = LoggerFactory.getLogger(PayrollService.class);

    private final PayrollRunRepository payrollRunRepository;
    private final PayslipRepository payslipRepository;
    private final EmployeeRepository employeeRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final UserRepository userRepository;
    private final Clock clock;
    private final JdbcTemplate jdbcTemplate;

    private final AtomicLong fallbackRunSeq = new AtomicLong(1001);
    private final AtomicLong fallbackSlipSeq = new AtomicLong(1001);

    public PayrollService(
            PayrollRunRepository payrollRunRepository,
            PayslipRepository payslipRepository,
            EmployeeRepository employeeRepository,
            AttendanceRecordRepository attendanceRecordRepository,
            LeaveRequestRepository leaveRequestRepository,
            UserRepository userRepository,
            Clock clock,
            JdbcTemplate jdbcTemplate
    ) {
        this.payrollRunRepository = payrollRunRepository;
        this.payslipRepository = payslipRepository;
        this.employeeRepository = employeeRepository;
        this.attendanceRecordRepository = attendanceRecordRepository;
        this.leaveRequestRepository = leaveRequestRepository;
        this.userRepository = userRepository;
        this.clock = clock;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public PayrollRunDto generatePayroll(GeneratePayrollRequest req, UUID processedByUserId) {
        int year = req.getYear();
        int month = req.getMonth();

        YearMonth ym = YearMonth.of(year, month);
        int daysInMonth = ym.lengthOfMonth();
        LocalDate monthStart = ym.atDay(1);
        LocalDate monthEnd = ym.atEndOfMonth();

        User processedBy = userRepository.findById(processedByUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + processedByUserId));

        // 1. Check if payroll run already exists for this year/month
        Optional<PayrollRun> existingOpt = payrollRunRepository.findByYearAndMonth(year, month);
        PayrollRun run;

        if (existingOpt.isPresent()) {
            run = existingOpt.get();
            // Rule: Re-run only allowed from DRAFT or REVIEW. Locked payroll (APPROVED/PAID) denied!
            if (run.getStatus() == PayrollRunStatus.APPROVED || run.getStatus() == PayrollRunStatus.PAID) {
                throw new ConflictException("Payroll for " + ym + " is locked with status " + run.getStatus() +
                        ". Modifications or recalculations are strictly denied.");
            }
            log.info("Recalculating existing draft payroll run: {} for {}", run.getRunNumber(), ym);
            // Clear existing payslips for idempotent re-run
            run.getPayslips().clear();
            payslipRepository.deleteAll(payslipRepository.findByPayrollRunIdOrderByPayslipNumberAsc(run.getId()));
        } else {
            String runNumber = generateRunNumber(year, month);
            run = PayrollRun.builder()
                    .runNumber(runNumber)
                    .year(year)
                    .month(month)
                    .status(PayrollRunStatus.DRAFT)
                    .processedBy(processedBy)
                    .notes(req.getNotes() != null ? req.getNotes() : "Monthly payroll run for " + ym)
                    .build();
            run = payrollRunRepository.save(run);
        }

        // 2. Fetch active employees
        List<Employee> allEmployees = employeeRepository.findByIsDeletedFalseOrderByCreatedAtAsc();

        BigDecimal runGross = BigDecimal.ZERO;
        BigDecimal runDeductions = BigDecimal.ZERO;
        BigDecimal runNet = BigDecimal.ZERO;
        List<Payslip> payslips = new ArrayList<>();

        for (Employee emp : allEmployees) {
            // Check if employee was active in this month
            if (emp.getJoinDate().isAfter(monthEnd)) {
                continue; // Joined in a future month
            }
            if (emp.getExitDate() != null && emp.getExitDate().isBefore(monthStart)) {
                continue; // Exited in a past month
            }

            // Proration calculation (mid-month join or exit)
            LocalDate effectiveStart = emp.getJoinDate().isAfter(monthStart) ? emp.getJoinDate() : monthStart;
            LocalDate effectiveEnd = (emp.getExitDate() != null && emp.getExitDate().isBefore(monthEnd)) ?
                    emp.getExitDate() : monthEnd;

            long activeDays = Math.max(0, effectiveEnd.toEpochDay() - effectiveStart.toEpochDay() + 1);
            if (activeDays <= 0) continue;

            BigDecimal prorationFactor = BigDecimal.valueOf(activeDays)
                    .divide(BigDecimal.valueOf(daysInMonth), 4, RoundingMode.HALF_UP);

            BigDecimal proratedBase = emp.getBaseSalary()
                    .multiply(prorationFactor)
                    .setScale(2, RoundingMode.HALF_UP);

            // Calculate unpaid leave days in this month
            List<LeaveRequest> unpaidLeaves = leaveRequestRepository.findApprovedLeavesInPeriod(
                    emp.getId(), monthStart, monthEnd
            ).stream()
             .filter(l -> "UNPAID".equalsIgnoreCase(l.getLeaveTypeCode()))
             .collect(Collectors.toList());

            BigDecimal unpaidLeaveDays = BigDecimal.ZERO;
            for (LeaveRequest ul : unpaidLeaves) {
                unpaidLeaveDays = unpaidLeaveDays.add(ul.getTotalDays());
            }

            BigDecimal dailyRate = emp.getBaseSalary()
                    .divide(BigDecimal.valueOf(daysInMonth), 4, RoundingMode.HALF_UP);
            BigDecimal unpaidLeaveDeduction = dailyRate.multiply(unpaidLeaveDays).setScale(2, RoundingMode.HALF_UP);

            // Overtime from attendance records
            List<AttendanceRecord> attendanceList = attendanceRecordRepository
                    .findByEmployeeIdAndWorkDateBetweenOrderByWorkDateAsc(emp.getId(), monthStart, monthEnd);

            BigDecimal totalOvertimeHours = attendanceList.stream()
                    .map(AttendanceRecord::getOvertimeHours)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal hourlyRate = emp.getHourlyRate().compareTo(BigDecimal.ZERO) > 0 ?
                    emp.getHourlyRate() :
                    emp.getBaseSalary().divide(new BigDecimal("160.00"), 2, RoundingMode.HALF_UP);

            // 1.5x overtime multiplier
            BigDecimal overtimePay = hourlyRate.multiply(new BigDecimal("1.50"))
                    .multiply(totalOvertimeHours)
                    .setScale(2, RoundingMode.HALF_UP);

            // Allowances: Standard wellness & meal allowance
            BigDecimal allowances = new BigDecimal("1500.00");

            BigDecimal grossPay = proratedBase.add(overtimePay).add(allowances).setScale(2, RoundingMode.HALF_UP);

            // Taxes & Deductions:
            // TDS: 10% on gross if monthly gross exceeds 50,000; plus flat Professional Tax (Rs 200)
            BigDecimal taxDeduction = BigDecimal.ZERO;
            if (grossPay.compareTo(new BigDecimal("50000.00")) > 0) {
                taxDeduction = grossPay.multiply(new BigDecimal("0.10")).setScale(2, RoundingMode.HALF_UP);
            }
            BigDecimal professionalTax = new BigDecimal("200.00");
            BigDecimal otherDeductions = professionalTax;

            BigDecimal totalDeductions = taxDeduction
                    .add(unpaidLeaveDeduction)
                    .add(otherDeductions)
                    .setScale(2, RoundingMode.HALF_UP);

            BigDecimal netPay = grossPay.subtract(totalDeductions).setScale(2, RoundingMode.HALF_UP);
            if (netPay.compareTo(BigDecimal.ZERO) < 0) {
                netPay = BigDecimal.ZERO;
            }

            String payslipNumber = String.format("PS-%d-%02d-%s", year, month, emp.getEmpNo());

            Payslip payslip = Payslip.builder()
                    .payrollRun(run)
                    .employee(emp)
                    .payslipNumber(payslipNumber)
                    .year(year)
                    .month(month)
                    .baseSalary(emp.getBaseSalary())
                    .prorationFactor(prorationFactor)
                    .workingDaysInMonth(daysInMonth)
                    .daysWorked(BigDecimal.valueOf(activeDays).subtract(unpaidLeaveDays))
                    .unpaidLeaveDays(unpaidLeaveDays)
                    .overtimeHours(totalOvertimeHours)
                    .overtimePay(overtimePay)
                    .allowances(allowances)
                    .grossPay(grossPay)
                    .taxDeduction(taxDeduction)
                    .unpaidLeaveDeduction(unpaidLeaveDeduction)
                    .otherDeductions(otherDeductions)
                    .totalDeductions(totalDeductions)
                    .netPay(netPay)
                    .status(PayslipStatus.DRAFT)
                    .pdfUrl("/api/v1/hr/payroll/payslips/" + payslipNumber + "/pdf")
                    .build();

            payslips.add(payslip);

            runGross = runGross.add(grossPay);
            runDeductions = runDeductions.add(totalDeductions);
            runNet = runNet.add(netPay);
        }

        run.setTotalGross(runGross);
        run.setTotalDeductions(runDeductions);
        run.setTotalNet(runNet);
        run.setPayslips(payslips);

        PayrollRun savedRun = payrollRunRepository.save(run);
        payslipRepository.saveAll(payslips);

        log.info("Successfully generated payroll run {} for {} (payslips={}, totalNet={})",
                savedRun.getRunNumber(), ym, payslips.size(), runNet);

        return PayrollRunDto.fromEntity(savedRun);
    }

    @Transactional
    public PayrollRunDto updatePayrollStatus(UUID runId, UpdatePayrollStatusRequest req, UUID reviewerUserId) {
        PayrollRun run = payrollRunRepository.findById(runId)
                .orElseThrow(() -> new ResourceNotFoundException("Payroll run not found with id: " + runId));

        User reviewer = userRepository.findById(reviewerUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Reviewer user not found: " + reviewerUserId));

        PayrollRunStatus currentStatus = run.getStatus();
        PayrollRunStatus targetStatus = req.getStatus();

        // Locked checks
        if ((currentStatus == PayrollRunStatus.APPROVED || currentStatus == PayrollRunStatus.PAID)
                && targetStatus == PayrollRunStatus.DRAFT) {
            throw new ConflictException("Locked payroll edits denied. Cannot revert locked payroll " +
                    run.getRunNumber() + " back to DRAFT.");
        }

        if (currentStatus == PayrollRunStatus.PAID && targetStatus != PayrollRunStatus.PAID) {
            throw new ConflictException("Payroll run " + run.getRunNumber() + " is already marked PAID and is permanently locked.");
        }

        run.setStatus(targetStatus);
        if (req.getNotes() != null && !req.getNotes().isBlank()) {
            run.setNotes(req.getNotes());
        }

        if (targetStatus == PayrollRunStatus.APPROVED) {
            run.setApprovedBy(reviewer);
            run.setApprovedAt(clock.instant());
            // Update payslip statuses to APPROVED
            for (Payslip p : run.getPayslips()) {
                p.setStatus(PayslipStatus.APPROVED);
            }
        } else if (targetStatus == PayrollRunStatus.PAID) {
            run.setPaidAt(clock.instant());
            for (Payslip p : run.getPayslips()) {
                p.setStatus(PayslipStatus.PAID);
            }
        }

        PayrollRun saved = payrollRunRepository.save(run);
        return PayrollRunDto.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public List<PayrollRunDto> getAllPayrollRuns() {
        return payrollRunRepository.findAllByOrderByYearDescMonthDesc().stream()
                .map(PayrollRunDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PayrollRunDto getPayrollRunById(UUID id) {
        PayrollRun run = payrollRunRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payroll run not found with id: " + id));
        return PayrollRunDto.fromEntity(run);
    }

    @Transactional(readOnly = true)
    public List<PayslipDto> getPayslipsForRun(UUID runId) {
        return payslipRepository.findByPayrollRunIdOrderByPayslipNumberAsc(runId).stream()
                .map(PayslipDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PayslipDto> getEmployeePayslips(UUID employeeId, UUID currentUserId, Role userRole) {
        Employee emp = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + employeeId));

        // Enforce RBAC: regular staff can only see their own payslips
        if (userRole != Role.OWNER && userRole != Role.MANAGER) {
            if (!emp.getUser().getId().equals(currentUserId)) {
                throw new ForbiddenException("Staff members are only permitted to view their own payslips");
            }
        }

        return payslipRepository.findByEmployeeIdOrderByYearDescMonthDesc(employeeId).stream()
                .map(PayslipDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PayslipDto getPayslipById(UUID id, UUID currentUserId, Role userRole) {
        Payslip ps = payslipRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payslip not found with id: " + id));

        // Enforce RBAC
        if (userRole != Role.OWNER && userRole != Role.MANAGER) {
            if (!ps.getEmployee().getUser().getId().equals(currentUserId)) {
                throw new ForbiddenException("Access denied: You may only view your own payslips");
            }
        }

        return PayslipDto.fromEntity(ps);
    }

    @Transactional(readOnly = true)
    public byte[] generatePayslipPdf(UUID payslipId, UUID currentUserId, Role userRole) {
        Payslip ps = payslipRepository.findById(payslipId)
                .orElseThrow(() -> new ResourceNotFoundException("Payslip not found with id: " + payslipId));

        if (userRole != Role.OWNER && userRole != Role.MANAGER) {
            if (!ps.getEmployee().getUser().getId().equals(currentUserId)) {
                throw new ForbiddenException("Access denied: You may only download your own payslip");
            }
        }

        Employee emp = ps.getEmployee();
        String document = "%PDF-1.4\n" +
                "% CHAMPIONS CLUB OFFICIAL SALARY PAYSLIP\n" +
                "==========================================================\n" +
                "PAYSLIP REFERENCE: " + ps.getPayslipNumber() + "\n" +
                "PERIOD:            " + ps.getYear() + "-" + String.format("%02d", ps.getMonth()) + "\n" +
                "STATUS:            " + ps.getStatus() + "\n" +
                "----------------------------------------------------------\n" +
                "EMPLOYEE DETAILS:\n" +
                "Employee Name:     " + (emp.getUser() != null ? emp.getUser().getFullName() : "N/A") + "\n" +
                "Employee ID:       " + emp.getEmpNo() + "\n" +
                "Designation:       " + emp.getDesignation() + "\n" +
                "Department:        " + emp.getDepartment() + "\n" +
                "Bank Account:      " + (emp.getBankAccountMasked() != null ? emp.getBankAccountMasked() : "N/A") + "\n" +
                "PAN Number:        " + (emp.getPanNumberMasked() != null ? emp.getPanNumberMasked() : "N/A") + "\n" +
                "----------------------------------------------------------\n" +
                "EARNINGS:                              AMOUNT (INR)\n" +
                "Base Salary:                           " + ps.getBaseSalary() + "\n" +
                "Proration Factor:                      " + ps.getProrationFactor() + "\n" +
                "Overtime Pay (" + ps.getOvertimeHours() + " hrs):            " + ps.getOvertimePay() + "\n" +
                "Allowances (Wellness/Bonus):           " + ps.getAllowances() + "\n" +
                "GROSS SALARY:                          " + ps.getGrossPay() + "\n" +
                "----------------------------------------------------------\n" +
                "DEDUCTIONS:                            AMOUNT (INR)\n" +
                "Tax (TDS):                             " + ps.getTaxDeduction() + "\n" +
                "Unpaid Leave (" + ps.getUnpaidLeaveDays() + " days):          " + ps.getUnpaidLeaveDeduction() + "\n" +
                "Other / Professional Tax:              " + ps.getOtherDeductions() + "\n" +
                "TOTAL DEDUCTIONS:                      " + ps.getTotalDeductions() + "\n" +
                "----------------------------------------------------------\n" +
                "NET TAKE-HOME SALARY:                  " + ps.getNetPay() + "\n" +
                "==========================================================\n" +
                "Generated by Champions Club Enterprise HR & Payroll System\n";

        return document.getBytes(StandardCharsets.UTF_8);
    }

    private String generateRunNumber(int year, int month) {
        try {
            Long nextVal = jdbcTemplate.queryForObject("SELECT nextval('payroll_run_no_seq')", Long.class);
            return String.format("PR-%d-%02d-%04d", year, month, nextVal != null ? nextVal : fallbackRunSeq.incrementAndGet());
        } catch (Exception e) {
            return String.format("PR-%d-%02d-%04d", year, month, fallbackRunSeq.incrementAndGet());
        }
    }
}
