package com.championsclub.reporting.dto;

import com.championsclub.reporting.domain.RecurringFrequency;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class CreateExpenseRequest {

    @NotBlank(message = "Category is required")
    private String category;

    @NotBlank(message = "Description is required")
    private String description;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.0", message = "Amount must not be negative")
    private BigDecimal amount;

    private BigDecimal taxAmount;

    private String vendor;

    private LocalDate expenseDate;

    private LocalDate dueDate;

    private boolean isRecurring;

    private RecurringFrequency recurringFrequency;

    private String notes;
}
