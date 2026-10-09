package com.championsclub.hr.repo;

import com.championsclub.hr.domain.LeaveRequest;
import com.championsclub.hr.domain.LeaveRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, UUID> {

    List<LeaveRequest> findByEmployeeIdOrderByCreatedAtDesc(UUID employeeId);

    List<LeaveRequest> findByStatusOrderByCreatedAtDesc(LeaveRequestStatus status);

    List<LeaveRequest> findAllByOrderByCreatedAtDesc();

    @Query("SELECT r FROM LeaveRequest r WHERE r.employee.id = :empId " +
           "AND r.status IN ('PENDING', 'APPROVED') " +
           "AND r.startDate <= :end AND r.endDate >= :start")
    List<LeaveRequest> findOverlappingRequests(
            @Param("empId") UUID empId,
            @Param("start") LocalDate start,
            @Param("end") LocalDate end
    );

    @Query("SELECT r FROM LeaveRequest r WHERE r.employee.id = :empId " +
           "AND r.status = 'APPROVED' " +
           "AND r.startDate <= :end AND r.endDate >= :start")
    List<LeaveRequest> findApprovedLeavesInPeriod(
            @Param("empId") UUID empId,
            @Param("start") LocalDate start,
            @Param("end") LocalDate end
    );
}
