package com.championsclub.shop.repo;

import com.championsclub.shop.domain.ClubService;
import com.championsclub.shop.domain.ServiceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClubServiceRepository extends JpaRepository<ClubService, UUID> {
    Optional<ClubService> findByCode(String code);
    List<ClubService> findByActiveTrue();
    List<ClubService> findByServiceTypeAndActiveTrue(ServiceType serviceType);
}
