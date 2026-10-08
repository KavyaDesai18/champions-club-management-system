package com.championsclub.shop.repo;

import com.championsclub.shop.domain.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, UUID> {
    Optional<Supplier> findByNameIgnoreCase(String name);
    List<Supplier> findByActiveTrueOrderByNameAsc();
}
