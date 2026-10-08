package com.championsclub.billing.repo;

import com.championsclub.billing.domain.TaxRate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TaxRateRepository extends JpaRepository<TaxRate, UUID> {

    Optional<TaxRate> findByCode(String code);

    List<TaxRate> findByIsActiveTrue();
}
