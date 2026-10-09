package com.championsclub.reporting.dto;

import com.championsclub.reporting.domain.ExpenseStatus;
import com.championsclub.reporting.domain.RecurringFrequency;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateExpenseRequest {
    private String category;
    private String description;
    private BigDecimal amount;
    private BigDecimal taxAmount;
    private String vendor;
    private LocalDate expenseDate;
    private LocalDate dueDate;
    private ExpenseStatus status;
    private String paymentMethod;
    private Boolean isRecurring;
    private RecurringFrequency recurringFrequency;
    private String notes;
}
