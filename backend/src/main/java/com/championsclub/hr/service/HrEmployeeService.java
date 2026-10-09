package com.championsclub.hr.service;

import com.championsclub.common.error.BadRequestException;
import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.hr.domain.Employee;
import com.championsclub.hr.domain.LeaveBalance;
import com.championsclub.hr.domain.LeaveType;
import com.championsclub.hr.dto.CreateEmployeeRequest;
import com.championsclub.hr.dto.EmployeeDto;
import com.championsclub.hr.dto.UpdateEmployeeRequest;
import com.championsclub.hr.repo.EmployeeRepository;
import com.championsclub.hr.repo.LeaveBalanceRepository;
import com.championsclub.hr.repo.LeaveTypeRepository;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Service
public class HrEmployeeService {

    private static final Logger log = LoggerFactory.getLogger(HrEmployeeService.class);

    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final LeaveBalanceRepository leaveBalanceRepository;
    private final JdbcTemplate jdbcTemplate;

    private final AtomicLong fallbackEmpSeq = new AtomicLong(1001);

    public HrEmployeeService(
            EmployeeRepository employeeRepository,
            UserRepository userRepository,
            LeaveTypeRepository leaveTypeRepository,
            LeaveBalanceRepository leaveBalanceRepository,
            JdbcTemplate jdbcTemplate
    ) {
        this.employeeRepository = employeeRepository;
        this.userRepository = userRepository;
        this.leaveTypeRepository = leaveTypeRepository;
        this.leaveBalanceRepository = leaveBalanceRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public List<EmployeeDto> getAllEmployees() {
        return employeeRepository.findByIsDeletedFalseOrderByCreatedAtAsc().stream()
                .map(EmployeeDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public EmployeeDto getEmployeeById(UUID id) {
        Employee emp = employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + id));
        return EmployeeDto.fromEntity(emp);
    }

    @Transactional(readOnly = true)
    public EmployeeDto getEmployeeByUserId(UUID userId) {
        Employee emp = employeeRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee record not found for user: " + userId));
        return EmployeeDto.fromEntity(emp);
    }

    @Transactional
    public EmployeeDto createEmployee(CreateEmployeeRequest req) {
        if (employeeRepository.existsByUserId(req.getUserId())) {
            throw new BadRequestException("An employee record already exists for this user account");
        }

        User user = userRepository.findById(req.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + req.getUserId()));

        String empNo = generateEmpNo();

        String maskedBank = maskBankAccount(req.getBankAccount());
        String maskedPan = maskPanNumber(req.getPanNumber());

        Employee emp = Employee.builder()
                .user(user)
                .empNo(empNo)
                .designation(req.getDesignation().trim())
                .department(req.getDepartment().trim().toUpperCase())
                .joinDate(req.getJoinDate())
                .salaryType(req.getSalaryType())
                .baseSalary(req.getBaseSalary())
                .hourlyRate(req.getHourlyRate() != null ? req.getHourlyRate() : BigDecimal.ZERO)
                .bankName(req.getBankName())
                .bankAccountMasked(maskedBank)
                .bankIfsc(req.getBankIfsc())
                .panNumberMasked(maskedPan)
                .emergencyContactPhone(req.getEmergencyContactPhone())
                .notes(req.getNotes())
                .build();

        Employee saved = employeeRepository.save(emp);

        // Initialize leave balances for the joining year
        initializeLeaveBalances(saved, req.getJoinDate().getYear());

        log.info("Created employee record: {} (empNo={}) for user: {}", saved.getId(), saved.getEmpNo(), user.getEmail());
        return EmployeeDto.fromEntity(saved);
    }

    @Transactional
    public EmployeeDto updateEmployee(UUID id, UpdateEmployeeRequest req) {
        Employee emp = employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + id));

        if (req.getDesignation() != null) emp.setDesignation(req.getDesignation().trim());
        if (req.getDepartment() != null) emp.setDepartment(req.getDepartment().trim().toUpperCase());
        if (req.getSalaryType() != null) emp.setSalaryType(req.getSalaryType());
        if (req.getBaseSalary() != null) emp.setBaseSalary(req.getBaseSalary());
        if (req.getHourlyRate() != null) emp.setHourlyRate(req.getHourlyRate());
        if (req.getBankName() != null) emp.setBankName(req.getBankName());
        if (req.getBankAccount() != null && !req.getBankAccount().isBlank()) {
            emp.setBankAccountMasked(maskBankAccount(req.getBankAccount()));
        }
        if (req.getBankIfsc() != null) emp.setBankIfsc(req.getBankIfsc());
        if (req.getPanNumber() != null && !req.getPanNumber().isBlank()) {
            emp.setPanNumberMasked(maskPanNumber(req.getPanNumber()));
        }
        if (req.getStatus() != null) emp.setStatus(req.getStatus());
        if (req.getExitDate() != null) emp.setExitDate(req.getExitDate());
        if (req.getEmergencyContactPhone() != null) emp.setEmergencyContactPhone(req.getEmergencyContactPhone());
        if (req.getNotes() != null) emp.setNotes(req.getNotes());

        Employee updated = employeeRepository.save(emp);
        return EmployeeDto.fromEntity(updated);
    }

    @Transactional
    public void initializeLeaveBalances(Employee emp, int year) {
        List<LeaveType> types = leaveTypeRepository.findAllByOrderByCodeAsc();
        if (types.isEmpty()) {
            // Seed standard types if not present
            types = List.of(
                    LeaveType.builder().code("CASUAL").name("Casual Leave").annualQuota(new BigDecimal("12.0")).isPaid(true).build(),
                    LeaveType.builder().code("SICK").name("Sick Leave").annualQuota(new BigDecimal("12.0")).isPaid(true).build(),
                    LeaveType.builder().code("PAID").name("Earned Leave").annualQuota(new BigDecimal("15.0")).isPaid(true).build(),
                    LeaveType.builder().code("UNPAID").name("Leave Without Pay").annualQuota(BigDecimal.ZERO).isPaid(false).build()
            );
        }

        for (LeaveType lt : types) {
            if (leaveBalanceRepository.findByEmployeeIdAndLeaveTypeCodeAndYear(emp.getId(), lt.getCode(), year).isEmpty()) {
                LeaveBalance lb = LeaveBalance.builder()
                        .employee(emp)
                        .leaveTypeCode(lt.getCode())
                        .year(year)
                        .allocatedDays(lt.getAnnualQuota())
                        .usedDays(BigDecimal.ZERO)
                        .pendingDays(BigDecimal.ZERO)
                        .remainingDays(lt.getAnnualQuota())
                        .build();
                leaveBalanceRepository.save(lb);
            }
        }
    }

    private String generateEmpNo() {
        try {
            Long nextVal = jdbcTemplate.queryForObject("SELECT nextval('emp_no_seq')", Long.class);
            return String.format("EMP-%04d", nextVal != null ? nextVal : fallbackEmpSeq.incrementAndGet());
        } catch (Exception e) {
            return String.format("EMP-%04d", fallbackEmpSeq.incrementAndGet());
        }
    }

    public static String maskBankAccount(String account) {
        if (account == null || account.trim().length() < 4) {
            return "••••••••1234";
        }
        String clean = account.trim();
        String last4 = clean.substring(clean.length() - 4);
        return "••••••••" + last4;
    }

    public static String maskPanNumber(String pan) {
        if (pan == null || pan.trim().length() < 10) {
            return "ABCDE••••F";
        }
        String clean = pan.trim().toUpperCase();
        return clean.substring(0, 5) + "••••" + clean.substring(clean.length() - 1);
    }
}
