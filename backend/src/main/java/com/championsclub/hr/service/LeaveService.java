package com.championsclub.hr.service;

import com.championsclub.common.error.BadRequestException;
import com.championsclub.common.error.ConflictException;
import com.championsclub.common.error.ForbiddenException;
import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.hr.domain.*;
import com.championsclub.hr.dto.*;
import com.championsclub.hr.repo.*;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class LeaveService {

    private static final Logger log = LoggerFactory.getLogger(LeaveService.class);

    private final LeaveRequestRepository leaveRequestRepository;
    private final LeaveBalanceRepository leaveBalanceRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final HolidayRepository holidayRepository;
    private final EmployeeRepository employeeRepository;
    private final RosterShiftRepository rosterShiftRepository;
    private final UserRepository userRepository;
    private final LeaveCalculator leaveCalculator;
    private final Clock clock;

    public LeaveService(
            LeaveRequestRepository leaveRequestRepository,
            LeaveBalanceRepository leaveBalanceRepository,
            LeaveTypeRepository leaveTypeRepository,
            HolidayRepository holidayRepository,
            EmployeeRepository employeeRepository,
            RosterShiftRepository rosterShiftRepository,
            UserRepository userRepository,
            LeaveCalculator leaveCalculator,
            Clock clock
    ) {
        this.leaveRequestRepository = leaveRequestRepository;
        this.leaveBalanceRepository = leaveBalanceRepository;
        this.leaveTypeRepository = leaveTypeRepository;
        this.holidayRepository = holidayRepository;
        this.employeeRepository = employeeRepository;
        this.rosterShiftRepository = rosterShiftRepository;
        this.userRepository = userRepository;
        this.leaveCalculator = leaveCalculator;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public LeaveCalculationDto calculateLeave(LocalDate start, LocalDate end, boolean isHalfDay) {
        List<Holiday> holidays = holidayRepository.findAllByOrderByHolidayDateAsc();
        return leaveCalculator.calculateWorkingDays(start, end, isHalfDay, holidays);
    }

    @Transactional
    public LeaveRequestDto applyLeave(ApplyLeaveRequest req, UUID currentUserId) {
        Employee emp = resolveEmployee(req.getEmployeeId(), currentUserId);

        if (req.getStartDate().isAfter(req.getEndDate())) {
            throw new BadRequestException("Start date cannot be after end date");
        }

        // 1. Calculate working days (excluding weekends & holidays)
        List<Holiday> holidays = holidayRepository.findAllByOrderByHolidayDateAsc();
        LeaveCalculationDto calc = leaveCalculator.calculateWorkingDays(
                req.getStartDate(), req.getEndDate(), req.isHalfDay(), holidays
        );

        if (!calc.isValid() || calc.getWorkingDaysCount().compareTo(BigDecimal.ZERO) <= 0) {
            String msg = calc.getValidationMessage() != null ?
                    calc.getValidationMessage() :
                    "Requested leave period contains zero working days (weekends or public holidays)";
            throw new BadRequestException(msg);
        }

        BigDecimal requestedDays = calc.getWorkingDaysCount();

        // 2. Overlap check with existing PENDING or APPROVED requests
        List<LeaveRequest> overlapping = leaveRequestRepository.findOverlappingRequests(
                emp.getId(), req.getStartDate(), req.getEndDate()
        );
        if (!overlapping.isEmpty()) {
            LeaveRequest firstConflict = overlapping.get(0);
            throw new ConflictException("Employee already has an active " + firstConflict.getStatus() +
                    " leave request overlapping from " + firstConflict.getStartDate() + " to " + firstConflict.getEndDate());
        }

        // 3. Balance check (for paid leave types)
        String typeCode = req.getLeaveTypeCode().trim().toUpperCase();
        int year = req.getStartDate().getYear();

        if (!"UNPAID".equalsIgnoreCase(typeCode)) {
            LeaveBalance balance = leaveBalanceRepository
                    .findByEmployeeIdAndLeaveTypeCodeAndYear(emp.getId(), typeCode, year)
                    .orElseThrow(() -> new BadRequestException("No leave balance record allocated for type " + typeCode + " in year " + year));

            if (balance.getRemainingDays().compareTo(requestedDays) < 0) {
                throw new BadRequestException("Insufficient leave balance for " + typeCode +
                        ". Remaining: " + balance.getRemainingDays() + ", Requested: " + requestedDays);
            }

            // Reserve days in pending balance
            balance.setPendingDays(balance.getPendingDays().add(requestedDays));
            balance.setRemainingDays(balance.getAllocatedDays().subtract(balance.getUsedDays()).subtract(balance.getPendingDays()));
            leaveBalanceRepository.save(balance);
        }

        LeaveRequest leaveRequest = LeaveRequest.builder()
                .employee(emp)
                .leaveTypeCode(typeCode)
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .isHalfDay(req.isHalfDay())
                .halfDaySession(req.getHalfDaySession())
                .totalDays(requestedDays)
                .reason(req.getReason().trim())
                .status(LeaveRequestStatus.PENDING)
                .build();

        LeaveRequest saved = leaveRequestRepository.save(leaveRequest);
        log.info("Leave request submitted: {} for emp: {} (days={})", saved.getId(), emp.getEmpNo(), requestedDays);
        return LeaveRequestDto.fromEntity(saved);
    }

    @Transactional
    public LeaveApprovalResultDto reviewLeave(UUID leaveRequestId, ReviewLeaveRequest req, UUID reviewerUserId) {
        LeaveRequest leave = leaveRequestRepository.findById(leaveRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Leave request not found with id: " + leaveRequestId));

        if (leave.getStatus() != LeaveRequestStatus.PENDING) {
            throw new ConflictException("Leave request is already " + leave.getStatus() + " and cannot be reviewed again");
        }

        User reviewer = userRepository.findById(reviewerUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Reviewer user not found: " + reviewerUserId));

        // Rule: Cannot approve own leave
        if (reviewer.getId().equals(leave.getEmployee().getUser().getId())) {
            throw new ForbiddenException("Managers cannot review or approve their own leave requests");
        }

        Employee emp = leave.getEmployee();
        int year = leave.getStartDate().getYear();
        String typeCode = leave.getLeaveTypeCode();
        List<String> coverageWarnings = new ArrayList<>();

        if (req.getStatus() == LeaveRequestStatus.APPROVED) {
            leave.setStatus(LeaveRequestStatus.APPROVED);
            leave.setReviewer(reviewer);
            leave.setReviewComment(req.getComment());
            leave.setReviewedAt(clock.instant());

            // Deduct from leave balance
            if (!"UNPAID".equalsIgnoreCase(typeCode)) {
                leaveBalanceRepository.findByEmployeeIdAndLeaveTypeCodeAndYear(emp.getId(), typeCode, year)
                        .ifPresent(balance -> {
                            balance.setPendingDays(balance.getPendingDays().subtract(leave.getTotalDays()));
                            balance.setUsedDays(balance.getUsedDays().add(leave.getTotalDays()));
                            balance.setRemainingDays(balance.getAllocatedDays().subtract(balance.getUsedDays()).subtract(balance.getPendingDays()));
                            leaveBalanceRepository.save(balance);
                        });
            }

            // Check if employee has planned shifts in this date range & detect coverage gaps
            List<RosterShift> shiftsDuringLeave = rosterShiftRepository.findShiftsForEmployeeInDateRange(
                    emp.getId(), leave.getStartDate(), leave.getEndDate()
            );

            for (RosterShift shift : shiftsDuringLeave) {
                long otherStaffCount = rosterShiftRepository.countOtherStaffScheduledForRole(
                        shift.getRole(), shift.getShiftDate(), emp.getId()
                );
                if (otherStaffCount == 0) {
                    coverageWarnings.add("Coverage gap: No remaining " + shift.getRole() +
                            " scheduled on " + shift.getShiftDate() + " (" + shift.getStation() + ")");
                }
            }

        } else if (req.getStatus() == LeaveRequestStatus.REJECTED) {
            leave.setStatus(LeaveRequestStatus.REJECTED);
            leave.setReviewer(reviewer);
            leave.setReviewComment(req.getComment());
            leave.setReviewedAt(clock.instant());

            // Release pending days back to available balance
            if (!"UNPAID".equalsIgnoreCase(typeCode)) {
                leaveBalanceRepository.findByEmployeeIdAndLeaveTypeCodeAndYear(emp.getId(), typeCode, year)
                        .ifPresent(balance -> {
                            balance.setPendingDays(balance.getPendingDays().subtract(leave.getTotalDays()));
                            balance.setRemainingDays(balance.getAllocatedDays().subtract(balance.getUsedDays()).subtract(balance.getPendingDays()));
                            leaveBalanceRepository.save(balance);
                        });
            }
        } else {
            throw new BadRequestException("Invalid review action: " + req.getStatus());
        }

        LeaveRequest updated = leaveRequestRepository.save(leave);
        return LeaveApprovalResultDto.builder()
                .leaveRequest(LeaveRequestDto.fromEntity(updated))
                .coverageWarnings(coverageWarnings)
                .rosterUpdated(true)
                .build();
    }

    @Transactional(readOnly = true)
    public List<LeaveBalanceDto> getLeaveBalances(UUID employeeId, int year) {
        return leaveBalanceRepository.findByEmployeeIdAndYear(employeeId, year).stream()
                .map(LeaveBalanceDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<LeaveRequestDto> getEmployeeLeaveRequests(UUID employeeId) {
        return leaveRequestRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId).stream()
                .map(LeaveRequestDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<LeaveRequestDto> getAllLeaveRequests() {
        return leaveRequestRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(LeaveRequestDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<HolidayDto> getAllHolidays() {
        return holidayRepository.findAllByOrderByHolidayDateAsc().stream()
                .map(HolidayDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<LeaveTypeDto> getAllLeaveTypes() {
        return leaveTypeRepository.findAllByOrderByCodeAsc().stream()
                .map(LeaveTypeDto::fromEntity)
                .collect(Collectors.toList());
    }

    private Employee resolveEmployee(UUID explicitEmployeeId, UUID currentUserId) {
        if (explicitEmployeeId != null) {
            return employeeRepository.findById(explicitEmployeeId)
                    .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + explicitEmployeeId));
        }
        return employeeRepository.findByUserId(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("No employee profile found for user account " + currentUserId));
    }
}
