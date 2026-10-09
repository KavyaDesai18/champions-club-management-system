package com.championsclub.hr.api;

import com.championsclub.common.security.Role;
import com.championsclub.hr.dto.AttendanceRecordDto;
import com.championsclub.hr.dto.ClockInRequest;
import com.championsclub.hr.dto.ClockOutRequest;
import com.championsclub.hr.dto.RegularizeAttendanceRequest;
import com.championsclub.hr.service.AttendanceService;
import com.championsclub.hr.service.HrEmployeeService;
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
@RequestMapping("/api/v1/hr/attendance")
@Tag(name = "Attendance Board", description = "Clock-in/out, missing clock-out auto-detection, and regularization")
public class AttendanceController {

    private final AttendanceService attendanceService;
    private final HrEmployeeService employeeService;

    public AttendanceController(AttendanceService attendanceService, HrEmployeeService employeeService) {
        this.attendanceService = attendanceService;
        this.employeeService = employeeService;
    }

    @PostMapping("/clock-in")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'FRONT_DESK', 'BAR_STAFF', 'KITCHEN', 'SHOP_STAFF', 'COACH')")
    @Operation(summary = "Staff clock-in for the day")
    public ResponseEntity<AttendanceRecordDto> clockIn(
            @RequestBody(required = false) ClockInRequest request,
            Authentication authentication
    ) {
        User user = authentication != null && authentication.getPrincipal() instanceof User u ? u : null;
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(attendanceService.clockIn(request, user.getId()));
    }

    @PostMapping("/clock-out")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'FRONT_DESK', 'BAR_STAFF', 'KITCHEN', 'SHOP_STAFF', 'COACH')")
    @Operation(summary = "Staff clock-out for the day")
    public ResponseEntity<AttendanceRecordDto> clockOut(
            @RequestBody(required = false) ClockOutRequest request,
            Authentication authentication
    ) {
        User user = authentication != null && authentication.getPrincipal() instanceof User u ? u : null;
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(attendanceService.clockOut(request, user.getId()));
    }

    @GetMapping("/today")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Get real-time club attendance board for today")
    public ResponseEntity<List<AttendanceRecordDto>> getTodayAttendance() {
        return ResponseEntity.ok(attendanceService.getTodayAttendance());
    }

    @GetMapping("/my-history")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get current authenticated staff member's attendance history")
    public ResponseEntity<List<AttendanceRecordDto>> getMyAttendance(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            Authentication authentication
    ) {
        User user = authentication != null && authentication.getPrincipal() instanceof User u ? u : null;
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        var emp = employeeService.getEmployeeByUserId(user.getId());
        return ResponseEntity.ok(attendanceService.getEmployeeAttendance(emp.getId(), from, to));
    }

    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'FRONT_DESK', 'BAR_STAFF', 'KITCHEN', 'SHOP_STAFF', 'COACH')")
    @Operation(summary = "Get employee attendance records")
    public ResponseEntity<List<AttendanceRecordDto>> getEmployeeAttendance(
            @PathVariable UUID employeeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            Authentication authentication
    ) {
        User user = authentication != null && authentication.getPrincipal() instanceof User u ? u : null;
        if (user != null && user.getRole() != Role.OWNER && user.getRole() != Role.MANAGER) {
            var myEmp = employeeService.getEmployeeByUserId(user.getId());
            if (!myEmp.getId().equals(employeeId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }
        return ResponseEntity.ok(attendanceService.getEmployeeAttendance(employeeId, from, to));
    }

    @PostMapping("/missing-scan")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Trigger auto-flagging of missing clock-outs")
    public ResponseEntity<Integer> flagMissingClockOuts() {
        return ResponseEntity.ok(attendanceService.flagMissingClockOuts());
    }

    @PostMapping("/{id}/regularize")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Regularize attendance record")
    public ResponseEntity<AttendanceRecordDto> regularize(
            @PathVariable UUID id,
            @Valid @RequestBody RegularizeAttendanceRequest request,
            Authentication authentication
    ) {
        User user = authentication != null && authentication.getPrincipal() instanceof User u ? u : null;
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(attendanceService.regularize(id, request, user.getId()));
    }
}
