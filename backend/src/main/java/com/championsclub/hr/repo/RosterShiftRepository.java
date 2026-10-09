package com.championsclub.hr.repo;

import com.championsclub.hr.domain.RosterShift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface RosterShiftRepository extends JpaRepository<RosterShift, UUID> {

    List<RosterShift> findByShiftDateBetweenOrderByShiftDateAscStartTimeAsc(LocalDate from, LocalDate to);

    List<RosterShift> findByEmployeeIdAndShiftDateBetween(UUID employeeId, LocalDate from, LocalDate to);

    List<RosterShift> findByEmployeeIdAndShiftDate(UUID employeeId, LocalDate shiftDate);

    List<RosterShift> findByDepartmentAndShiftDate(String department, LocalDate shiftDate);

    List<RosterShift> findByShiftDate(LocalDate shiftDate);

    @Query("SELECT r FROM RosterShift r WHERE r.employee.id = :empId AND r.shiftDate BETWEEN :start AND :end")
    List<RosterShift> findShiftsForEmployeeInDateRange(
            @Param("empId") UUID empId,
            @Param("start") LocalDate start,
            @Param("end") LocalDate end
    );

    @Query("SELECT COUNT(r) FROM RosterShift r WHERE r.role = :role AND r.shiftDate = :date AND r.employee.id != :excludedEmpId")
    long countOtherStaffScheduledForRole(
            @Param("role") String role,
            @Param("date") LocalDate date,
            @Param("excludedEmpId") UUID excludedEmpId
    );
}
