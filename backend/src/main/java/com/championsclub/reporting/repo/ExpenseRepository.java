package com.championsclub.reporting.repo;

import com.championsclub.reporting.domain.Expense;
import com.championsclub.reporting.domain.ExpenseStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, UUID> {

    Optional<Expense> findByExpenseNumber(String expenseNumber);

    List<Expense> findByExpenseDateBetweenOrderByExpenseDateDesc(LocalDate startDate, LocalDate endDate);

    List<Expense> findByStatusOrderByDueDateAsc(ExpenseStatus status);

    List<Expense> findByRecurringTrue();

    @Query("SELECT COALESCE(SUM(e.totalAmount), 0) FROM Expense e WHERE e.status = :status AND e.expenseDate BETWEEN :startDate AND :endDate")
    BigDecimal sumTotalByStatusAndDateRange(@Param("status") ExpenseStatus status,
                                            @Param("startDate") LocalDate startDate,
                                            @Param("endDate") LocalDate endDate);

    @Query("SELECT COALESCE(SUM(e.totalAmount), 0) FROM Expense e WHERE e.status = :status")
    BigDecimal sumTotalByStatus(@Param("status") ExpenseStatus status);

    @Query("SELECT COALESCE(SUM(e.taxAmount), 0) FROM Expense e WHERE e.status = 'PAID' AND e.expenseDate BETWEEN :startDate AND :endDate")
    BigDecimal sumTaxCreditInDateRange(@Param("startDate") LocalDate startDate,
                                       @Param("endDate") LocalDate endDate);

    @Query("SELECT COALESCE(SUM(e.taxAmount), 0) FROM Expense e WHERE e.status != 'CANCELLED'")
    BigDecimal sumTotalInputTaxCredit();

    @Query("SELECT e FROM Expense e WHERE e.status = 'PENDING' AND e.dueDate IS NOT NULL AND e.dueDate < :today")
    List<Expense> findOverdueExpenses(@Param("today") LocalDate today);

    @Query("SELECT e FROM Expense e WHERE e.status = 'PENDING' AND (e.dueDate IS NULL OR e.dueDate >= :today)")
    List<Expense> findDueSoonExpenses(@Param("today") LocalDate today);
}
