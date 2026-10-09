package com.championsclub.reporting.service;

import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.UserRepository;
import com.championsclub.reporting.domain.Expense;
import com.championsclub.reporting.domain.ExpenseCategory;
import com.championsclub.reporting.domain.ExpenseStatus;
import com.championsclub.reporting.domain.RecurringFrequency;
import com.championsclub.reporting.dto.CreateExpenseRequest;
import com.championsclub.reporting.dto.ExpenseDto;
import com.championsclub.reporting.dto.UpdateExpenseRequest;
import com.championsclub.reporting.repo.ExpenseCategoryRepository;
import com.championsclub.reporting.repo.ExpenseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final ExpenseCategoryRepository expenseCategoryRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<ExpenseDto> getExpenses(LocalDate startDate, LocalDate endDate, ExpenseStatus status, String category) {
        LocalDate start = (startDate != null) ? startDate : LocalDate.now().minusMonths(1);
        LocalDate end = (endDate != null) ? endDate : LocalDate.now();

        List<Expense> expenses = expenseRepository.findByExpenseDateBetweenOrderByExpenseDateDesc(start, end);

        return expenses.stream()
                .filter(e -> status == null || e.getStatus() == status)
                .filter(e -> category == null || category.isBlank() || e.getCategory().equalsIgnoreCase(category))
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ExpenseDto getExpenseById(UUID id) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Expense", id));
        return mapToDto(expense);
    }

    @Transactional
    public ExpenseDto createExpense(CreateExpenseRequest request, UUID currentUserId) {
        User creator = (currentUserId != null) ? userRepository.findById(currentUserId).orElse(null) : null;

        BigDecimal amount = (request.getAmount() != null) ? request.getAmount() : BigDecimal.ZERO;
        BigDecimal tax = (request.getTaxAmount() != null) ? request.getTaxAmount() : BigDecimal.ZERO;
        BigDecimal total = amount.add(tax);

        String expenseNumber = "EXP-" + LocalDate.now().getYear() + "-" + String.format("%04d", (int)(Math.random() * 9000 + 1000));

        Expense expense = Expense.builder()
                .expenseNumber(expenseNumber)
                .category(request.getCategory().toUpperCase().trim())
                .description(request.getDescription())
                .amount(amount)
                .taxAmount(tax)
                .totalAmount(total)
                .vendor(request.getVendor())
                .expenseDate(request.getExpenseDate() != null ? request.getExpenseDate() : LocalDate.now())
                .dueDate(request.getDueDate())
                .status(ExpenseStatus.PENDING)
                .recurring(request.isRecurring())
                .recurringFrequency(request.getRecurringFrequency() != null ? request.getRecurringFrequency() : RecurringFrequency.NONE)
                .notes(request.getNotes())
                .createdBy(creator)
                .build();

        Expense saved = expenseRepository.save(expense);
        log.info("Created expense {}: {} for amount {}", saved.getExpenseNumber(), saved.getDescription(), saved.getTotalAmount());
        return mapToDto(saved);
    }

    @Transactional
    public ExpenseDto updateExpense(UUID id, UpdateExpenseRequest request) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Expense", id));

        if (request.getCategory() != null) expense.setCategory(request.getCategory().toUpperCase().trim());
        if (request.getDescription() != null) expense.setDescription(request.getDescription());
        if (request.getVendor() != null) expense.setVendor(request.getVendor());
        if (request.getExpenseDate() != null) expense.setExpenseDate(request.getExpenseDate());
        if (request.getDueDate() != null) expense.setDueDate(request.getDueDate());
        if (request.getStatus() != null) expense.setStatus(request.getStatus());
        if (request.getPaymentMethod() != null) expense.setPaymentMethod(request.getPaymentMethod());
        if (request.getNotes() != null) expense.setNotes(request.getNotes());
        if (request.getIsRecurring() != null) expense.setRecurring(request.getIsRecurring());
        if (request.getRecurringFrequency() != null) expense.setRecurringFrequency(request.getRecurringFrequency());

        if (request.getAmount() != null) {
            expense.setAmount(request.getAmount());
            BigDecimal tax = (request.getTaxAmount() != null) ? request.getTaxAmount() : expense.getTaxAmount();
            expense.setTaxAmount(tax);
            expense.setTotalAmount(request.getAmount().add(tax != null ? tax : BigDecimal.ZERO));
        } else if (request.getTaxAmount() != null) {
            expense.setTaxAmount(request.getTaxAmount());
            expense.setTotalAmount(expense.getAmount().add(request.getTaxAmount()));
        }

        Expense updated = expenseRepository.save(expense);
        return mapToDto(updated);
    }

    @Transactional
    public ExpenseDto markAsPaid(UUID id, String paymentMethod) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Expense", id));

        expense.setStatus(ExpenseStatus.PAID);
        expense.setPaymentMethod(paymentMethod != null ? paymentMethod : "BANK_TRANSFER");
        expense.setPaidAt(Instant.now());

        Expense saved = expenseRepository.save(expense);
        log.info("Expense {} marked as PAID via {}", saved.getExpenseNumber(), saved.getPaymentMethod());
        return mapToDto(saved);
    }

    @Transactional(readOnly = true)
    public List<ExpenseCategory> getCategories() {
        return expenseCategoryRepository.findByActiveTrueOrderByCodeAsc();
    }

    public ExpenseDto mapToDto(Expense e) {
        return ExpenseDto.builder()
                .id(e.getId())
                .expenseNumber(e.getExpenseNumber())
                .category(e.getCategory())
                .description(e.getDescription())
                .amount(e.getAmount())
                .taxAmount(e.getTaxAmount())
                .totalAmount(e.getTotalAmount())
                .vendor(e.getVendor())
                .expenseDate(e.getExpenseDate())
                .dueDate(e.getDueDate())
                .status(e.getStatus())
                .paymentMethod(e.getPaymentMethod())
                .paidAt(e.getPaidAt())
                .recurring(e.isRecurring())
                .recurringFrequency(e.getRecurringFrequency())
                .notes(e.getNotes())
                .createdByName(e.getCreatedBy() != null ? e.getCreatedBy().getFullName() : "System")
                .createdAt(e.getCreatedAt())
                .build();
    }
}
