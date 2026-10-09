package com.championsclub.hr.api;

import com.championsclub.common.security.Role;
import com.championsclub.hr.dto.CreateEmployeeRequest;
import com.championsclub.hr.dto.EmployeeDto;
import com.championsclub.hr.dto.UpdateEmployeeRequest;
import com.championsclub.hr.service.HrEmployeeService;
import com.championsclub.member.domain.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/hr/employees")
@Tag(name = "HR Employee Directory", description = "Staff records, designations, and profiles")
public class HrEmployeeController {

    private final HrEmployeeService employeeService;

    public HrEmployeeController(HrEmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "List all active club employees")
    public ResponseEntity<List<EmployeeDto>> getAllEmployees() {
        return ResponseEntity.ok(employeeService.getAllEmployees());
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get employee record of current authenticated user")
    public ResponseEntity<EmployeeDto> getCurrentEmployee(Authentication authentication) {
        User user = authentication != null && authentication.getPrincipal() instanceof User u ? u : null;
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(employeeService.getEmployeeByUserId(user.getId()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'FRONT_DESK', 'BAR_STAFF', 'KITCHEN', 'SHOP_STAFF', 'COACH')")
    @Operation(summary = "Get employee details by ID")
    public ResponseEntity<EmployeeDto> getEmployeeById(@PathVariable UUID id, Authentication authentication) {
        User user = authentication != null && authentication.getPrincipal() instanceof User u ? u : null;
        EmployeeDto dto = employeeService.getEmployeeById(id);
        if (user != null && user.getRole() != Role.OWNER && user.getRole() != Role.MANAGER) {
            if (!dto.getUserId().equals(user.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }
        return ResponseEntity.ok(dto);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Create a new employee profile")
    public ResponseEntity<EmployeeDto> createEmployee(@Valid @RequestBody CreateEmployeeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(employeeService.createEmployee(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Update employee record")
    public ResponseEntity<EmployeeDto> updateEmployee(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateEmployeeRequest request
    ) {
        return ResponseEntity.ok(employeeService.updateEmployee(id, request));
    }
}
