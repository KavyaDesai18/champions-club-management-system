package com.championsclub.reporting.dto;

import com.championsclub.reporting.domain.ExpenseStatus;
import com.championsclub.reporting.domain.RecurringFrequency;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExpenseDto {
    private UUID id;
    private String expenseNumber;
    private String category;
    private String description;
    private BigDecimal amount;
    private BigDecimal taxAmount;
    private BigDecimal totalAmount;
    private String vendor;
    private LocalDate expenseDate;
    private LocalDate dueDate;
    private ExpenseStatus status;
    private String paymentMethod;
    private Instant paidAt;
    private boolean recurring;
    private RecurringFrequency recurringFrequency;
    private String notes;
    private String createdByName;
    private Instant createdAt;
}
