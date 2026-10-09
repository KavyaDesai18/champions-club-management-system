package com.championsclub.bar.api;

import com.championsclub.bar.dto.*;
import com.championsclub.bar.service.TabService;
import com.championsclub.common.security.Role;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/bar/tabs", "/api/bar/tabs"})
@RequiredArgsConstructor
@Tag(name = "Bar Tabs & POS", description = "Tab lifecycle, order lines, optimistic locking, split bills, and settlements")
public class TabController {

    private final TabService tabService;
    private final UserRepository userRepository;

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'BAR_STAFF', 'FRONT_DESK')")
    @Operation(summary = "Open a new bar tab for a table, member, or guest")
    public ResponseEntity<TabDto> createTab(
            @Valid @RequestBody CreateTabRequest request,
            Authentication auth
    ) {
        User staff = resolveStaffUser(auth);
        TabDto dto = tabService.createTab(request, staff);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'BAR_STAFF', 'FRONT_DESK', 'KITCHEN')")
    @Operation(summary = "List all active open tabs")
    public ResponseEntity<List<TabDto>> getOpenTabs() {
        return ResponseEntity.ok(tabService.getOpenTabs());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'BAR_STAFF', 'FRONT_DESK', 'KITCHEN')")
    @Operation(summary = "Get tab details and running total by ID")
    public ResponseEntity<TabDto> getTabById(@PathVariable UUID id) {
        return ResponseEntity.ok(tabService.getTabById(id));
    }

    @GetMapping("/member/{memberId}/unsettled")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'BAR_STAFF', 'FRONT_DESK', 'MEMBER')")
    @Operation(summary = "Get unsettled tabs for a member (used in Member 360 and Front Desk Check-in)")
    public ResponseEntity<List<TabDto>> getUnsettledTabsForMember(@PathVariable UUID memberId) {
        return ResponseEntity.ok(tabService.getUnsettledTabsForMember(memberId));
    }

    @PostMapping("/{id}/items")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'BAR_STAFF')")
    @Operation(summary = "Add items to tab with optimistic locking version check and automatic plan discount")
    public ResponseEntity<TabDto> addItems(
            @PathVariable UUID id,
            @Valid @RequestBody AddTabItemsRequest request,
            Authentication auth
    ) {
        User staff = resolveStaffUser(auth);
        return ResponseEntity.ok(tabService.addItemsToTab(id, request, staff));
    }

    @PostMapping("/{id}/items/{itemId}/void")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'BAR_STAFF')")
    @Operation(summary = "Void a tab item (requires manager PIN/role if already served)")
    public ResponseEntity<TabDto> voidItem(
            @PathVariable UUID id,
            @PathVariable UUID itemId,
            @Valid @RequestBody VoidTabItemRequest request,
            Authentication auth
    ) {
        User staff = resolveStaffUser(auth);
        return ResponseEntity.ok(tabService.voidTabItem(id, itemId, request, staff));
    }

    @PostMapping("/{id}/split")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'BAR_STAFF')")
    @Operation(summary = "Split bill by equal parts or by items with penny-exact rounding")
    public ResponseEntity<List<TabSplitDto>> splitBill(
            @PathVariable UUID id,
            @Valid @RequestBody SplitBillRequest request
    ) {
        return ResponseEntity.ok(tabService.splitBill(id, request));
    }

    @GetMapping("/{id}/splits")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'BAR_STAFF')")
    @Operation(summary = "Get all split parts for a tab")
    public ResponseEntity<List<TabSplitDto>> getSplits(@PathVariable UUID id) {
        return ResponseEntity.ok(tabService.getTabSplits(id));
    }

    @PostMapping("/{id}/settle")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'BAR_STAFF', 'FRONT_DESK')")
    @Operation(summary = "Settle tab or split via cash/card/UPI/wallet with ledger posting and table release")
    public ResponseEntity<TabDto> settleTab(
            @PathVariable UUID id,
            @Valid @RequestBody SettleTabRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            Authentication auth
    ) {
        User staff = resolveStaffUser(auth);
        return ResponseEntity.ok(tabService.settleTab(id, request, staff, idempotencyKey));
    }

    @PostMapping("/{id}/carry-forward")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Carry forward an open tab across shift/day close with mandatory reason")
    public ResponseEntity<TabDto> carryForwardTab(
            @PathVariable UUID id,
            @Valid @RequestBody CarryForwardTabRequest request,
            Authentication auth
    ) {
        User staff = resolveStaffUser(auth);
        return ResponseEntity.ok(tabService.carryForwardTab(id, request, staff));
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
