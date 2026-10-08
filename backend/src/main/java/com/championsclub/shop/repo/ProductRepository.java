package com.championsclub.shop.repo;

import com.championsclub.shop.domain.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProductRepository extends JpaRepository<Product, UUID> {
    Optional<Product> findBySkuAndIsDeletedFalse(String sku);
    Optional<Product> findByIdAndIsDeletedFalse(UUID id);
    boolean existsBySkuIgnoreCaseAndIsDeletedFalse(String sku);

    @Query("SELECT p FROM Product p WHERE p.isDeleted = false AND p.active = true")
    List<Product> findAllActive();

    @Query("SELECT p FROM Product p WHERE p.isDeleted = false " +
           "AND (:categoryId IS NULL OR p.category.id = :categoryId) " +
           "AND (:brand IS NULL OR LOWER(p.brand) = LOWER(:brand)) " +
           "AND (:search IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Product> searchCatalog(@Param("categoryId") UUID categoryId,
                                @Param("brand") String brand,
                                @Param("search") String search,
                                Pageable pageable);
}
