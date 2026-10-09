package com.championsclub.crm.repo;

import com.championsclub.crm.domain.LeadActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LeadActivityRepository extends JpaRepository<LeadActivity, UUID> {

    List<LeadActivity> findByLeadIdOrderByCreatedAtDesc(UUID leadId);
}
