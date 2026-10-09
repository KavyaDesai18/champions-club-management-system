package com.championsclub.bar.api;

import com.championsclub.bar.dto.CloseShiftRequest;
import com.championsclub.bar.dto.DailyCloseReportDto;
import com.championsclub.bar.dto.OpenShiftRequest;
import com.championsclub.bar.dto.ShiftDto;
import com.championsclub.bar.service.ShiftService;
import com.championsclub.common.security.Role;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/bar/shifts", "/api/bar/shifts"})
@RequiredArgsConstructor
@Tag(name = "Bar Shifts & Daily Close", description = "Shift clock-in/out, float variance, and daily close reconciliation")
public class ShiftController {

    private final ShiftService shiftService;
    private final UserRepository userRepository;

    @PostMapping("/open")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'BAR_STAFF', 'KITCHEN')")
    @Operation(summary = "Open staff shift with opening cash float")
    public ResponseEntity<ShiftDto> openShift(
            @Valid @RequestBody OpenShiftRequest request,
            Authentication auth
    ) {
        User staff = resolveStaffUser(auth);
        ShiftDto dto = shiftService.openShift(request, staff);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'BAR_STAFF')")
    @Operation(summary = "Close staff shift with counted cash, variance calculation, and open tab handling")
    public ResponseEntity<ShiftDto> closeShift(
            @PathVariable UUID id,
            @Valid @RequestBody CloseShiftRequest request,
            Authentication auth
    ) {
        User staff = resolveStaffUser(auth);
        return ResponseEntity.ok(shiftService.closeShift(id, request, staff));
    }

    @GetMapping("/current")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'BAR_STAFF', 'KITCHEN')")
    @Operation(summary = "Get current active open shift for logged-in staff member")
    public ResponseEntity<ShiftDto> getCurrentShift(Authentication auth) {
        User staff = resolveStaffUser(auth);
        return ResponseEntity.ok(shiftService.getActiveShiftForUser(staff));
    }

    @GetMapping("/daily-close")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Generate Daily Close report reconciled against double-entry ledger")
    public ResponseEntity<DailyCloseReportDto> getDailyCloseReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return ResponseEntity.ok(shiftService.generateDailyCloseReport(date));
    }

    private User resolveStaffUser(Authentication auth) {
        if (auth != null && auth.getPrincipal() instanceof User user) {
            return user;
        }
        if (auth != null && auth.getName() != null) {
            Optional<User> u = userRepository.findByEmailAndIsDeletedFalse(auth.getName());
            if (u.isPresent()) return u.get();
        }
        return userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.BAR_STAFF || u.getRole() == Role.MANAGER || u.getRole() == Role.OWNER)
                .findFirst()
                .orElseGet(() -> userRepository.findAll().stream().findFirst().orElse(null));
    }
}
