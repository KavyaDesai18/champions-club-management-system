package com.championsclub.billing.api;

import com.championsclub.billing.dto.CashDrawerSessionResponse;
import com.championsclub.billing.dto.CloseDrawerRequest;
import com.championsclub.billing.dto.OpenDrawerRequest;
import com.championsclub.billing.service.CashDrawerService;
import org.springframework.security.core.Authentication;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/cash-drawer", "/api/cash-drawer"})
@RequiredArgsConstructor
@Tag(name = "Cash Drawer", description = "Cash drawer shift management, opening float, reconciliation, and cash audit")
public class CashDrawerController {

    private final CashDrawerService cashDrawerService;

    @PostMapping("/open")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'FRONT_DESK', 'SHOP_STAFF', 'BAR_STAFF')")
    @Operation(summary = "Open staff cash drawer shift with initial opening float")
    public ResponseEntity<CashDrawerSessionResponse> openDrawer(
            @Valid @RequestBody OpenDrawerRequest request,
            Authentication authentication
    ) {
        User currentUser = extractUser(authentication);
        return ResponseEntity.ok(cashDrawerService.openDrawer(currentUser, request));
    }

    @PostMapping("/close")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'FRONT_DESK', 'SHOP_STAFF', 'BAR_STAFF')")
    @Operation(summary = "Close cash drawer shift and compute discrepancies against physical count")
    public ResponseEntity<CashDrawerSessionResponse> closeDrawer(
            @Valid @RequestBody CloseDrawerRequest request,
            Authentication authentication
    ) {
        User currentUser = extractUser(authentication);
        return ResponseEntity.ok(cashDrawerService.closeDrawer(currentUser, request));
    }

    @GetMapping("/current")
    @Operation(summary = "Get active open drawer session for current authenticated staff member")
    public ResponseEntity<CashDrawerSessionResponse> getCurrentDrawer(Authentication authentication) {
        User currentUser = extractUser(authentication);
        if (currentUser == null) {
            return ResponseEntity.noContent().build();
        }
        return cashDrawerService.getActiveSessionForStaff(currentUser.getId())
                .map(s -> ResponseEntity.ok(cashDrawerService.getSessionDetails(s.getId())))
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    private User extractUser(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return user;
        }
        return null;
    }

    @GetMapping("/sessions")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "List all recent drawer sessions")
    public ResponseEntity<List<CashDrawerSessionResponse>> getAllSessions() {
        return ResponseEntity.ok(cashDrawerService.getAllRecentSessions());
    }

    @GetMapping("/sessions/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'FRONT_DESK')")
    @Operation(summary = "Get drawer session details and entry ledger")
    public ResponseEntity<CashDrawerSessionResponse> getSessionDetails(@PathVariable UUID id) {
        return ResponseEntity.ok(cashDrawerService.getSessionDetails(id));
    }
}
