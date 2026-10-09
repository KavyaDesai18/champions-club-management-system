package com.championsclub.hr.repo;

import com.championsclub.hr.domain.LeaveBalance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LeaveBalanceRepository extends JpaRepository<LeaveBalance, UUID> {

    List<LeaveBalance> findByEmployeeIdAndYear(UUID employeeId, int year);

    Optional<LeaveBalance> findByEmployeeIdAndLeaveTypeCodeAndYear(UUID employeeId, String leaveTypeCode, int year);
}
