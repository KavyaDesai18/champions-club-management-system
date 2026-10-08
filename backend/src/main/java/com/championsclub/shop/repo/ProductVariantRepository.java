package com.championsclub.shop.repo;

import com.championsclub.shop.domain.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProductVariantRepository extends JpaRepository<ProductVariant, UUID> {
    Optional<ProductVariant> findBySkuAndIsDeletedFalse(String sku);
    Optional<ProductVariant> findByBarcodeAndIsDeletedFalse(String barcode);
    Optional<ProductVariant> findByIdAndIsDeletedFalse(UUID id);
    List<ProductVariant> findByProductIdAndIsDeletedFalse(UUID productId);

    boolean existsBySkuIgnoreCaseAndIsDeletedFalse(String sku);
    boolean existsByBarcodeIgnoreCaseAndIsDeletedFalse(String barcode);

    @Query("SELECT v FROM ProductVariant v WHERE v.isDeleted = false AND v.product.isDeleted = false")
    List<ProductVariant> findAllActiveVariants();
}
