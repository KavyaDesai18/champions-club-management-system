package com.championsclub.crm.repo;

import com.championsclub.crm.domain.Lead;
import com.championsclub.crm.domain.LeadStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LeadRepository extends JpaRepository<Lead, UUID> {

    Optional<Lead> findByEmailIgnoreCase(String email);

    Optional<Lead> findByPhone(String phone);

    List<Lead> findByStatusOrderByCreatedAtDesc(LeadStatus status);

    List<Lead> findAllByOrderByCreatedAtDesc();

    @Query("SELECT l FROM Lead l WHERE l.followUpAt IS NOT NULL AND l.followUpAt < :cutoff AND l.status NOT IN :closedStatuses ORDER BY l.followUpAt ASC")
    List<Lead> findOverdueFollowUps(
            @Param("cutoff") Instant cutoff,
            @Param("closedStatuses") Collection<LeadStatus> closedStatuses
    );

    @Query("SELECT l FROM Lead l WHERE " +
            "LOWER(l.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(l.email) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "l.phone LIKE CONCAT('%', :query, '%') OR " +
            "LOWER(l.interest) LIKE LOWER(CONCAT('%', :query, '%')) " +
            "ORDER BY l.createdAt DESC")
    List<Lead> searchLeads(@Param("query") String query);

    long countByStatus(LeadStatus status);
}
