package com.championsclub.hr.api;

import com.championsclub.common.security.Role;
import com.championsclub.hr.dto.*;
import com.championsclub.hr.service.HrEmployeeService;
import com.championsclub.hr.service.LeaveService;
import com.championsclub.member.domain.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/hr/leave")
@Tag(name = "Leave Management", description = "Leave requests, balance checks, holiday calendars, and approval flow")
public class LeaveController {

    private final LeaveService leaveService;
    private final HrEmployeeService employeeService;

    public LeaveController(LeaveService leaveService, HrEmployeeService employeeService) {
        this.leaveService = leaveService;
        this.employeeService = employeeService;
    }

    @GetMapping("/calculate")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'FRONT_DESK', 'BAR_STAFF', 'KITCHEN', 'SHOP_STAFF', 'COACH')")
    @Operation(summary = "Preview working days calculation excluding weekends and public holidays")
    public ResponseEntity<LeaveCalculationDto> calculateLeave(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false, defaultValue = "false") boolean isHalfDay
    ) {
        return ResponseEntity.ok(leaveService.calculateLeave(startDate, endDate, isHalfDay));
    }

    @GetMapping("/holidays")
    @Operation(summary = "Get official club holidays")
    public ResponseEntity<List<HolidayDto>> getHolidays() {
        return ResponseEntity.ok(leaveService.getAllHolidays());
    }

    @GetMapping("/types")
    @Operation(summary = "Get club leave types and annual quotas")
    public ResponseEntity<List<LeaveTypeDto>> getLeaveTypes() {
        return ResponseEntity.ok(leaveService.getAllLeaveTypes());
    }

    @GetMapping("/balances")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'FRONT_DESK', 'BAR_STAFF', 'KITCHEN', 'SHOP_STAFF', 'COACH')")
    @Operation(summary = "Get leave balances for an employee")
    public ResponseEntity<List<LeaveBalanceDto>> getBalances(
            @RequestParam(required = false) UUID employeeId,
            @RequestParam(required = false) Integer year,
            Authentication authentication
    ) {
        User user = authentication != null && authentication.getPrincipal() instanceof User u ? u : null;
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        UUID targetEmpId;
        if (employeeId != null) {
            if (user.getRole() != Role.OWNER && user.getRole() != Role.MANAGER) {
                var myEmp = employeeService.getEmployeeByUserId(user.getId());
                if (!myEmp.getId().equals(employeeId)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                }
            }
            targetEmpId = employeeId;
        } else {
            targetEmpId = employeeService.getEmployeeByUserId(user.getId()).getId();
        }

        int targetYear = year != null ? year : LocalDate.now().getYear();
        return ResponseEntity.ok(leaveService.getLeaveBalances(targetEmpId, targetYear));
    }

    @GetMapping("/my-requests")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get leave requests of current employee")
    public ResponseEntity<List<LeaveRequestDto>> getMyRequests(Authentication authentication) {
        User user = authentication != null && authentication.getPrincipal() instanceof User u ? u : null;
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        var emp = employeeService.getEmployeeByUserId(user.getId());
        return ResponseEntity.ok(leaveService.getEmployeeLeaveRequests(emp.getId()));
    }

    @GetMapping("/requests")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Get all staff leave requests across club")
    public ResponseEntity<List<LeaveRequestDto>> getAllRequests() {
        return ResponseEntity.ok(leaveService.getAllLeaveRequests());
    }

    @PostMapping("/apply")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'FRONT_DESK', 'BAR_STAFF', 'KITCHEN', 'SHOP_STAFF', 'COACH')")
    @Operation(summary = "Submit a new leave request")
    public ResponseEntity<LeaveRequestDto> applyLeave(
            @Valid @RequestBody ApplyLeaveRequest request,
            Authentication authentication
    ) {
        User user = authentication != null && authentication.getPrincipal() instanceof User u ? u : null;
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(leaveService.applyLeave(request, user.getId()));
    }

    @PostMapping("/requests/{id}/review")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Review leave request (Approve or Reject with comment)")
    public ResponseEntity<LeaveApprovalResultDto> reviewLeave(
            @PathVariable UUID id,
            @Valid @RequestBody ReviewLeaveRequest request,
            Authentication authentication
    ) {
        User user = authentication != null && authentication.getPrincipal() instanceof User u ? u : null;
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(leaveService.reviewLeave(id, request, user.getId()));
    }
}
