package com.championsclub.reporting.api;

import com.championsclub.member.domain.User;
import com.championsclub.reporting.domain.ExpenseCategory;
import com.championsclub.reporting.domain.ExpenseStatus;
import com.championsclub.reporting.dto.CreateExpenseRequest;
import com.championsclub.reporting.dto.ExpenseDto;
import com.championsclub.reporting.dto.UpdateExpenseRequest;
import com.championsclub.reporting.service.ExpenseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/reporting/expenses", "/api/reporting/expenses"})
@RequiredArgsConstructor
@Tag(name = "Operating Expenses", description = "Endpoints for club operating expenses (rent, utilities, maintenance, etc.)")
@PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
public class ExpenseController {

    private final ExpenseService expenseService;

    @GetMapping
    @Operation(summary = "Get list of expenses with optional date/category/status filters")
    public ResponseEntity<List<ExpenseDto>> getExpenses(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) ExpenseStatus status,
            @RequestParam(required = false) String category
    ) {
        return ResponseEntity.ok(expenseService.getExpenses(startDate, endDate, status, category));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get expense by ID")
    public ResponseEntity<ExpenseDto> getExpenseById(@PathVariable UUID id) {
        return ResponseEntity.ok(expenseService.getExpenseById(id));
    }

    @PostMapping
    @Operation(summary = "Record a new operating expense")
    public ResponseEntity<ExpenseDto> createExpense(
            @Valid @RequestBody CreateExpenseRequest request,
            Authentication authentication
    ) {
        UUID userId = (authentication != null && authentication.getPrincipal() instanceof User u) ? u.getId() : null;
        return ResponseEntity.ok(expenseService.createExpense(request, userId));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an operating expense")
    public ResponseEntity<ExpenseDto> updateExpense(
            @PathVariable UUID id,
            @RequestBody UpdateExpenseRequest request
    ) {
        return ResponseEntity.ok(expenseService.updateExpense(id, request));
    }

    @PostMapping("/{id}/pay")
    @Operation(summary = "Mark an expense as paid")
    public ResponseEntity<ExpenseDto> markAsPaid(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String paymentMethod = (body != null && body.containsKey("paymentMethod"))
                ? body.get("paymentMethod")
                : "BANK_TRANSFER";
        return ResponseEntity.ok(expenseService.markAsPaid(id, paymentMethod));
    }

    @GetMapping("/categories")
    @Operation(summary = "List standard operating expense categories")
    public ResponseEntity<List<ExpenseCategory>> getCategories() {
        return ResponseEntity.ok(expenseService.getCategories());
    }
}
