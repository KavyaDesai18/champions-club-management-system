package com.championsclub.hr.service;

import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.hr.domain.Employee;
import com.championsclub.hr.domain.RosterShift;
import com.championsclub.hr.dto.CreateRosterShiftRequest;
import com.championsclub.hr.dto.PublishRosterRequest;
import com.championsclub.hr.dto.RosterCoverageGapDto;
import com.championsclub.hr.dto.RosterShiftDto;
import com.championsclub.hr.repo.EmployeeRepository;
import com.championsclub.hr.repo.RosterShiftRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class RosterService {

    private static final Logger log = LoggerFactory.getLogger(RosterService.class);

    private final RosterShiftRepository rosterShiftRepository;
    private final EmployeeRepository employeeRepository;

    public RosterService(
            RosterShiftRepository rosterShiftRepository,
            EmployeeRepository employeeRepository
    ) {
        this.rosterShiftRepository = rosterShiftRepository;
        this.employeeRepository = employeeRepository;
    }

    @Transactional(readOnly = true)
    public List<RosterShiftDto> getRoster(LocalDate from, LocalDate to) {
        LocalDate start = from != null ? from : LocalDate.now().minusDays(1);
        LocalDate end = to != null ? to : start.plusDays(7);

        return rosterShiftRepository.findByShiftDateBetweenOrderByShiftDateAscStartTimeAsc(start, end).stream()
                .map(RosterShiftDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RosterShiftDto> getEmployeeRoster(UUID employeeId, LocalDate from, LocalDate to) {
        LocalDate start = from != null ? from : LocalDate.now().minusDays(1);
        LocalDate end = to != null ? to : start.plusDays(7);

        return rosterShiftRepository.findByEmployeeIdAndShiftDateBetween(employeeId, start, end).stream()
                .map(RosterShiftDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public RosterShiftDto createShift(CreateRosterShiftRequest req) {
        Employee emp = employeeRepository.findById(req.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + req.getEmployeeId()));

        RosterShift shift = RosterShift.builder()
                .employee(emp)
                .shiftDate(req.getShiftDate())
                .startTime(req.getStartTime())
                .endTime(req.getEndTime())
                .department(req.getDepartment().trim().toUpperCase())
                .station(req.getStation().trim().toUpperCase())
                .role(req.getRole().trim().toUpperCase())
                .notes(req.getNotes())
                .isPublished(false)
                .build();

        RosterShift saved = rosterShiftRepository.save(shift);
        return RosterShiftDto.fromEntity(saved);
    }

    @Transactional
    public RosterShiftDto updateShift(UUID id, CreateRosterShiftRequest req) {
        RosterShift shift = rosterShiftRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Roster shift not found with id: " + id));

        if (req.getEmployeeId() != null && !shift.getEmployee().getId().equals(req.getEmployeeId())) {
            Employee emp = employeeRepository.findById(req.getEmployeeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + req.getEmployeeId()));
            shift.setEmployee(emp);
        }

        shift.setShiftDate(req.getShiftDate());
        shift.setStartTime(req.getStartTime());
        shift.setEndTime(req.getEndTime());
        shift.setDepartment(req.getDepartment().trim().toUpperCase());
        shift.setStation(req.getStation().trim().toUpperCase());
        shift.setRole(req.getRole().trim().toUpperCase());
        shift.setNotes(req.getNotes());

        RosterShift updated = rosterShiftRepository.save(shift);
        return RosterShiftDto.fromEntity(updated);
    }

    @Transactional
    public void deleteShift(UUID id) {
        if (!rosterShiftRepository.existsById(id)) {
            throw new ResourceNotFoundException("Roster shift not found with id: " + id);
        }
        rosterShiftRepository.deleteById(id);
    }

    @Transactional
    public List<RosterShiftDto> publishRoster(PublishRosterRequest req) {
        List<RosterShift> shifts = rosterShiftRepository.findByShiftDateBetweenOrderByShiftDateAscStartTimeAsc(
                req.getStartDate(), req.getEndDate()
        );

        Instant now = Instant.now();
        for (RosterShift s : shifts) {
            s.setPublished(true);
            s.setPublishedAt(now);
        }

        List<RosterShift> saved = rosterShiftRepository.saveAll(shifts);
        log.info("Published {} roster shifts between {} and {}", saved.size(), req.getStartDate(), req.getEndDate());
        return saved.stream().map(RosterShiftDto::fromEntity).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RosterCoverageGapDto> checkCoverageGaps(LocalDate date) {
        List<RosterCoverageGapDto> gaps = new ArrayList<>();
        List<String> requiredRoles = List.of("FRONT_DESK", "BAR_STAFF", "KITCHEN");

        List<RosterShift> dayShifts = rosterShiftRepository.findByShiftDate(date);

        for (String role : requiredRoles) {
            boolean hasStaff = dayShifts.stream().anyMatch(s -> role.equalsIgnoreCase(s.getRole()));
            if (!hasStaff) {
                gaps.add(RosterCoverageGapDto.builder()
                        .date(date)
                        .department("OPERATIONS")
                        .role(role)
                        .station(role)
                        .warningMessage("No " + role + " staff scheduled on " + date)
                        .build());
            }
        }
        return gaps;
    }
}
