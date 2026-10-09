package com.championsclub.reporting.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PayablesBreakdownDto {
    private BigDecimal supplierBills;           // Unpaid PO bills (P8)
    private BigDecimal expensesPending;          // Operating expenses (rent, utilities, maintenance)
    private BigDecimal payrollLiability;         // Unpaid approved payroll (P13)
    private BigDecimal gstPayable;               // GST collected - input tax credit
    private BigDecimal refundsPending;           // Unsettled/pending refunds
    private BigDecimal unsettledMemberCredits;   // Member wallet balances
    private BigDecimal totalPayables;            // Sum of all liabilities
}
