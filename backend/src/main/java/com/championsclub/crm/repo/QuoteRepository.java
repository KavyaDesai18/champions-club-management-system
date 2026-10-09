package com.championsclub.crm.repo;

import com.championsclub.crm.domain.Quote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface QuoteRepository extends JpaRepository<Quote, UUID> {

    List<Quote> findByLeadIdOrderByCreatedAtDesc(UUID leadId);

    Optional<Quote> findByQuoteNumber(String quoteNumber);
}
