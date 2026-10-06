package com.championsclub.member.service;

import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.member.domain.Plan;
import com.championsclub.member.dto.PlanDto;
import com.championsclub.member.repo.PlanRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class PlanService {

    private final PlanRepository planRepository;

    public PlanService(PlanRepository planRepository) {
        this.planRepository = planRepository;
    }

    public List<PlanDto> getAllActivePlans() {
        return planRepository.findByActiveTrue().stream()
                .map(PlanDto::fromEntity)
                .toList();
    }

    public Plan getPlanByCode(String code) {
        return planRepository.findByCode(code.toUpperCase().trim())
                .orElseThrow(() -> new ResourceNotFoundException("Plan not found with code: " + code, "PLAN_NOT_FOUND"));
    }

    public Plan getPlanById(UUID id) {
        return planRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Plan not found with ID: " + id, "PLAN_NOT_FOUND"));
    }
}
