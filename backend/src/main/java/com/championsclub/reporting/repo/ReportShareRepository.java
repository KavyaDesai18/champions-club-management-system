package com.championsclub.reporting.repo;

import com.championsclub.reporting.domain.ReportShare;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReportShareRepository extends JpaRepository<ReportShare, UUID> {
    Optional<ReportShare> findByShareToken(String shareToken);
    List<ReportShare> findAllByOrderByCreatedAtDesc();
}
