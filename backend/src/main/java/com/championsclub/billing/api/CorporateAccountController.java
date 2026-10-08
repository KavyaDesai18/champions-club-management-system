package com.championsclub.billing.api;

import com.championsclub.billing.domain.Invoice;
import com.championsclub.billing.dto.*;
import com.championsclub.billing.service.CorporateAccountService;
import com.championsclub.billing.service.InvoiceService;
import com.championsclub.member.domain.Member;
import com.championsclub.member.domain.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/corporate-accounts", "/api/corporate-accounts"})
@RequiredArgsConstructor
@Tag(name = "Corporate Accounts", description = "B2B client management, credit limits, consolidated monthly invoicing, and aging reports")
public class CorporateAccountController {

    private final CorporateAccountService corporateAccountService;
    private final InvoiceService invoiceService;

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'FRONT_DESK')")
    @Operation(summary = "List all corporate accounts")
    public ResponseEntity<List<CorporateAccountResponse>> getAllAccounts() {
        return ResponseEntity.ok(corporateAccountService.getAllAccounts());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'FRONT_DESK')")
    @Operation(summary = "Get corporate account details by ID")
    public ResponseEntity<CorporateAccountResponse> getAccountById(@PathVariable UUID id) {
        return ResponseEntity.ok(corporateAccountService.getAccountById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Register a new corporate account with GSTIN validation and credit limit")
    public ResponseEntity<CorporateAccountResponse> createAccount(
            @Valid @RequestBody CorporateAccountRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(corporateAccountService.createAccount(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Update corporate account details")
    public ResponseEntity<CorporateAccountResponse> updateAccount(
            @PathVariable UUID id,
            @Valid @RequestBody CorporateAccountRequest request
    ) {
        return ResponseEntity.ok(corporateAccountService.updateAccount(id, request));
    }

    @GetMapping("/aging-report")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Generate corporate accounts aging report (Current, 1-30, 31-60, 61-90, 90+ days)")
    public ResponseEntity<AgingReportResponse> getAgingReport() {
        return ResponseEntity.ok(corporateAccountService.getAgingReport());
    }

    @PostMapping("/bulk-members")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Bulk onboard corporate employees with negotiated membership plan pricing")
    public ResponseEntity<List<Member>> bulkOnboardMembers(
            @Valid @RequestBody BulkCorporateMembersRequest request,
            org.springframework.security.core.Authentication authentication
    ) {
        User currentUser = extractUser(authentication);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(corporateAccountService.bulkOnboardCorporateMembers(request, currentUser));
    }

    @PostMapping("/{id}/consolidated-invoice")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Generate consolidated monthly invoice for a corporate account itemised by employee")
    public ResponseEntity<InvoiceResponse> generateConsolidatedInvoice(
            @PathVariable UUID id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            org.springframework.security.core.Authentication authentication
    ) {
        User currentUser = extractUser(authentication);
        LocalDate start = startDate != null ? startDate : LocalDate.now().minusMonths(1).withDayOfMonth(1);
        LocalDate end = endDate != null ? endDate : LocalDate.now().withDayOfMonth(1).minusDays(1);

        Invoice inv = invoiceService.createConsolidatedCorporateInvoice(id, start, end, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(invoiceService.mapToResponse(inv));
    }

    private User extractUser(org.springframework.security.core.Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return user;
        }
        return null;
    }
}
