package com.championsclub.court.repo;

import com.championsclub.court.domain.PricingRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface PricingRuleRepository extends JpaRepository<PricingRule, UUID> {

    @Query("SELECT pr FROM PricingRule pr WHERE pr.isActive = true AND pr.isDeleted = false " +
           "AND (pr.sport.id = :sportId OR pr.sport IS NULL) " +
           "AND (pr.validFrom IS NULL OR pr.validFrom <= :date) " +
           "AND (pr.validTo IS NULL OR pr.validTo >= :date) " +
           "ORDER BY pr.priority DESC")
    List<PricingRule> findCandidateRules(
            @Param("sportId") UUID sportId,
            @Param("date") LocalDate date
    );

    @Query("SELECT pr FROM PricingRule pr WHERE pr.isActive = true AND pr.isDeleted = false " +
           "AND (pr.validFrom IS NULL OR pr.validFrom <= :date) " +
           "AND (pr.validTo IS NULL OR pr.validTo >= :date) " +
           "ORDER BY pr.priority DESC")
    List<PricingRule> findAllCandidateRulesForDate(@Param("date") LocalDate date);

    List<PricingRule> findAllByIsDeletedFalseOrderByPriorityDescCreatedAtDesc();
}
