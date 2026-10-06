package com.championsclub.member.repo;

import com.championsclub.member.domain.Plan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PlanRepository extends JpaRepository<Plan, UUID> {
    Optional<Plan> findByCode(String code);
    List<Plan> findByActiveTrue();
    boolean existsByCode(String code);
}
