package com.championsclub.hr.service;

import com.championsclub.common.error.ConflictException;
import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.hr.domain.AttendanceRecord;
import com.championsclub.hr.domain.AttendanceSource;
import com.championsclub.hr.domain.AttendanceStatus;
import com.championsclub.hr.domain.Employee;
import com.championsclub.hr.dto.AttendanceRecordDto;
import com.championsclub.hr.dto.ClockInRequest;
import com.championsclub.hr.dto.ClockOutRequest;
import com.championsclub.hr.dto.RegularizeAttendanceRequest;
import com.championsclub.hr.repo.AttendanceRecordRepository;
import com.championsclub.hr.repo.EmployeeRepository;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AttendanceService {

    private static final Logger log = LoggerFactory.getLogger(AttendanceService.class);

    private final AttendanceRecordRepository attendanceRecordRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final Clock clock;
    private final ZoneId clubZone;

    public AttendanceService(
            AttendanceRecordRepository attendanceRecordRepository,
            EmployeeRepository employeeRepository,
            UserRepository userRepository,
            Clock clock,
            @Value("${app.club.timezone:Asia/Kolkata}") String timezone
    ) {
        this.attendanceRecordRepository = attendanceRecordRepository;
        this.employeeRepository = employeeRepository;
        this.userRepository = userRepository;
        this.clock = clock;
        this.clubZone = ZoneId.of(timezone);
    }

    @Transactional
    public AttendanceRecordDto clockIn(ClockInRequest req, UUID currentUserId) {
        Employee emp = resolveEmployee(req != null ? req.getEmployeeId() : null, currentUserId);

        // Double clock-in prevention check
        Optional<AttendanceRecord> active = attendanceRecordRepository.findActiveClockInForEmployee(emp.getId());
        if (active.isPresent()) {
            throw new ConflictException("Active attendance session already in progress for employee " + emp.getEmpNo());
        }

        Instant now = clock.instant();
        ZonedDateTime nowInZone = now.atZone(clubZone);
        LocalDate workDate = nowInZone.toLocalDate(); // Origin day for overnight shift attribution

        AttendanceRecord record = AttendanceRecord.builder()
                .employee(emp)
                .workDate(workDate)
                .clockIn(now)
                .clockOut(null)
                .source(req != null && req.getSource() != null ? req.getSource() : AttendanceSource.WEB_CONSOLE)
                .status(AttendanceStatus.PRESENT)
                .totalHours(BigDecimal.ZERO)
                .overtimeHours(BigDecimal.ZERO)
                .build();

        AttendanceRecord saved = attendanceRecordRepository.save(record);
        log.info("Employee {} (empNo={}) clocked in at {}", emp.getId(), emp.getEmpNo(), now);
        return AttendanceRecordDto.fromEntity(saved);
    }

    @Transactional
    public AttendanceRecordDto clockOut(ClockOutRequest req, UUID currentUserId) {
        Employee emp = resolveEmployee(req != null ? req.getEmployeeId() : null, currentUserId);

        AttendanceRecord record = attendanceRecordRepository.findActiveClockInForEmployee(emp.getId())
                .orElseThrow(() -> new ResourceNotFoundException("No active clock-in session found for employee " + emp.getEmpNo()));

        Instant now = clock.instant();
        record.setClockOut(now);

        long minutes = Math.max(0, Duration.between(record.getClockIn(), now).toMinutes());
        BigDecimal totalHours = BigDecimal.valueOf(minutes)
                .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
        record.setTotalHours(totalHours);

        // Overtime: standard work day is 8.00 hours
        if (totalHours.compareTo(new BigDecimal("8.00")) > 0) {
            record.setOvertimeHours(totalHours.subtract(new BigDecimal("8.00")));
        } else {
            record.setOvertimeHours(BigDecimal.ZERO);
        }

        AttendanceRecord saved = attendanceRecordRepository.save(record);
        log.info("Employee {} (empNo={}) clocked out. Total hours: {}", emp.getId(), emp.getEmpNo(), totalHours);
        return AttendanceRecordDto.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public List<AttendanceRecordDto> getTodayAttendance() {
        LocalDate today = LocalDate.now(clubZone);
        return attendanceRecordRepository.findByWorkDateOrderByClockInAsc(today).stream()
                .map(AttendanceRecordDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AttendanceRecordDto> getEmployeeAttendance(UUID employeeId, LocalDate from, LocalDate to) {
        LocalDate start = from != null ? from : LocalDate.now(clubZone).minusDays(30);
        LocalDate end = to != null ? to : LocalDate.now(clubZone);

        return attendanceRecordRepository.findByEmployeeIdAndWorkDateBetweenOrderByWorkDateAsc(employeeId, start, end).stream()
                .map(AttendanceRecordDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public int flagMissingClockOuts() {
        LocalDate today = LocalDate.now(clubZone);
        List<AttendanceRecord> missing = attendanceRecordRepository.findMissingClockOutsBefore(today);

        for (AttendanceRecord r : missing) {
            r.setStatus(AttendanceStatus.AUTO_FLAGGED_MISSING_CLOCK_OUT);
            // Default total hours = 0 until regularized
            r.setTotalHours(BigDecimal.ZERO);
            r.setOvertimeHours(BigDecimal.ZERO);
        }

        attendanceRecordRepository.saveAll(missing);
        if (!missing.isEmpty()) {
            log.warn("Auto-flagged {} attendance records with missing clock-outs", missing.size());
        }
        return missing.size();
    }

    @Transactional
    public AttendanceRecordDto regularize(UUID attendanceId, RegularizeAttendanceRequest req, UUID reviewerUserId) {
        AttendanceRecord record = attendanceRecordRepository.findById(attendanceId)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance record not found with id: " + attendanceId));

        User reviewer = userRepository.findById(reviewerUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Reviewer user not found: " + reviewerUserId));

        record.setClockIn(req.getClockIn());
        record.setClockOut(req.getClockOut());
        record.setRegularizationNote(req.getReason());
        record.setRegularizedBy(reviewer);
        record.setRegularizedAt(clock.instant());
        record.setStatus(AttendanceStatus.REGULARIZED);

        long minutes = Math.max(0, Duration.between(req.getClockIn(), req.getClockOut()).toMinutes());
        BigDecimal totalHours = BigDecimal.valueOf(minutes)
                .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
        record.setTotalHours(totalHours);

        if (totalHours.compareTo(new BigDecimal("8.00")) > 0) {
            record.setOvertimeHours(totalHours.subtract(new BigDecimal("8.00")));
        } else {
            record.setOvertimeHours(BigDecimal.ZERO);
        }

        AttendanceRecord saved = attendanceRecordRepository.save(record);
        return AttendanceRecordDto.fromEntity(saved);
    }

    private Employee resolveEmployee(UUID explicitEmployeeId, UUID currentUserId) {
        if (explicitEmployeeId != null) {
            return employeeRepository.findById(explicitEmployeeId)
                    .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + explicitEmployeeId));
        }
        return employeeRepository.findByUserId(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("No employee profile found for user account " + currentUserId));
    }
}
