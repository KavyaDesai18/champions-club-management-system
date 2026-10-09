package com.championsclub.hr.repo;

import com.championsclub.hr.domain.AttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, UUID> {

    List<AttendanceRecord> findByEmployeeIdAndWorkDateBetweenOrderByWorkDateAsc(
            UUID employeeId, LocalDate from, LocalDate to
    );

    Optional<AttendanceRecord> findByEmployeeIdAndWorkDate(UUID employeeId, LocalDate workDate);

    List<AttendanceRecord> findByWorkDateOrderByClockInAsc(LocalDate workDate);

    @Query("SELECT a FROM AttendanceRecord a WHERE a.employee.id = :empId AND a.clockOut IS NULL")
    Optional<AttendanceRecord> findActiveClockInForEmployee(@Param("empId") UUID empId);

    @Query("SELECT a FROM AttendanceRecord a WHERE a.clockOut IS NULL AND a.workDate < :cutoffDate")
    List<AttendanceRecord> findMissingClockOutsBefore(@Param("cutoffDate") LocalDate cutoffDate);
}
