package com.championsclub.crm.repo;

import com.championsclub.crm.domain.CorporateClient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CorporateClientRepository extends JpaRepository<CorporateClient, UUID> {

    List<CorporateClient> findByCompanyNameContainingIgnoreCase(String companyName);
}
