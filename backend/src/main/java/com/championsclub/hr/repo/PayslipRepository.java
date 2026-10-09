package com.championsclub.hr.repo;

import com.championsclub.hr.domain.Payslip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PayslipRepository extends JpaRepository<Payslip, UUID> {

    List<Payslip> findByPayrollRunIdOrderByPayslipNumberAsc(UUID payrollRunId);

    List<Payslip> findByEmployeeIdOrderByYearDescMonthDesc(UUID employeeId);

    Optional<Payslip> findByEmployeeIdAndYearAndMonth(UUID employeeId, int year, int month);

    Optional<Payslip> findByPayslipNumber(String payslipNumber);
}
