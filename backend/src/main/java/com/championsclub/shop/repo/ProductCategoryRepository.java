package com.championsclub.shop.repo;

import com.championsclub.shop.domain.ProductCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProductCategoryRepository extends JpaRepository<ProductCategory, UUID> {
    Optional<ProductCategory> findByCode(String code);
    Optional<ProductCategory> findByNameIgnoreCase(String name);
    List<ProductCategory> findAllByOrderByDisplayOrderAsc();
}
