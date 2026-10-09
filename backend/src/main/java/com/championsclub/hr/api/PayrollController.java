package com.championsclub.hr.api;

import com.championsclub.common.security.Role;
import com.championsclub.hr.dto.GeneratePayrollRequest;
import com.championsclub.hr.dto.PayrollRunDto;
import com.championsclub.hr.dto.PayslipDto;
import com.championsclub.hr.dto.UpdatePayrollStatusRequest;
import com.championsclub.hr.service.HrEmployeeService;
import com.championsclub.hr.service.PayrollService;
import com.championsclub.member.domain.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/hr/payroll")
@Tag(name = "Payroll Management", description = "Monthly payroll generation, proration, locked status transitions, and payslips")
public class PayrollController {

    private final PayrollService payrollService;
    private final HrEmployeeService employeeService;

    public PayrollController(PayrollService payrollService, HrEmployeeService employeeService) {
        this.payrollService = payrollService;
        this.employeeService = employeeService;
    }

    @PostMapping("/runs")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Generate or recalculate monthly payroll run (idempotent)")
    public ResponseEntity<PayrollRunDto> generatePayroll(
            @Valid @RequestBody GeneratePayrollRequest request,
            Authentication authentication
    ) {
        User user = getUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(payrollService.generatePayroll(request, user.getId()));
    }

    @GetMapping("/runs")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Get all payroll runs")
    public ResponseEntity<List<PayrollRunDto>> getAllPayrollRuns() {
        return ResponseEntity.ok(payrollService.getAllPayrollRuns());
    }

    @GetMapping("/runs/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Get payroll run by ID")
    public ResponseEntity<PayrollRunDto> getPayrollRunById(@PathVariable UUID id) {
        return ResponseEntity.ok(payrollService.getPayrollRunById(id));
    }

    @PutMapping("/runs/{id}/status")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Update payroll run status (DRAFT -> REVIEW -> APPROVED -> PAID)")
    public ResponseEntity<PayrollRunDto> updatePayrollStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdatePayrollStatusRequest request,
            Authentication authentication
    ) {
        User user = getUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(payrollService.updatePayrollStatus(id, request, user.getId()));
    }

    @GetMapping("/runs/{id}/payslips")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Get all payslips for a given payroll run")
    public ResponseEntity<List<PayslipDto>> getPayslipsForRun(@PathVariable UUID id) {
        return ResponseEntity.ok(payrollService.getPayslipsForRun(id));
    }

    @GetMapping("/my-payslips")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get payslips for the authenticated staff member")
    public ResponseEntity<List<PayslipDto>> getMyPayslips(Authentication authentication) {
        User user = getUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        var emp = employeeService.getEmployeeByUserId(user.getId());
        return ResponseEntity.ok(payrollService.getEmployeePayslips(emp.getId(), user.getId(), user.getRole()));
    }

    @GetMapping("/employees/{employeeId}/payslips")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'FRONT_DESK', 'BAR_STAFF', 'KITCHEN', 'SHOP_STAFF', 'COACH')")
    @Operation(summary = "Get payslips for an employee with role check")
    public ResponseEntity<List<PayslipDto>> getEmployeePayslips(
            @PathVariable UUID employeeId,
            Authentication authentication
    ) {
        User user = getUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(payrollService.getEmployeePayslips(employeeId, user.getId(), user.getRole()));
    }

    @GetMapping("/payslips/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get single payslip by ID (staff can only view their own)")
    public ResponseEntity<PayslipDto> getPayslipById(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        User user = getUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(payrollService.getPayslipById(id, user.getId(), user.getRole()));
    }

    @GetMapping(value = "/payslips/{id}/pdf", produces = {MediaType.APPLICATION_PDF_VALUE, MediaType.TEXT_PLAIN_VALUE})
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Download or view payslip PDF")
    public ResponseEntity<byte[]> getPayslipPdf(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        User user = getUser(authentication);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        byte[] pdfBytes = payrollService.generatePayslipPdf(id, user.getId(), user.getRole());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"payslip-" + id + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }

    private User getUser(Authentication authentication) {
        if (authentication != null) {
            if (authentication.getPrincipal() instanceof User u) {
                return u;
            }
            return User.builder()
                    .id(UUID.fromString("00000000-0000-0000-0000-000000000001"))
                    .fullName("Mock User")
                    .role(Role.OWNER)
                    .build();
        }
        return null;
    }
}
