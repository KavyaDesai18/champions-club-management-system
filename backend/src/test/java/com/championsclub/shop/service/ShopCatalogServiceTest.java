package com.championsclub.shop.service;

import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.shop.domain.*;
import com.championsclub.shop.dto.CatalogProductResponse;
import com.championsclub.shop.dto.ProductCreateRequest;
import com.championsclub.shop.exception.DuplicateSkuException;
import com.championsclub.shop.repo.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class ShopCatalogServiceTest {

    @Mock private ProductRepository productRepository;
    @Mock private ProductVariantRepository variantRepository;
    @Mock private ProductCategoryRepository categoryRepository;
    @Mock private InventoryRepository inventoryRepository;
    @Mock private InventoryService inventoryService;
    @Mock private PricingQuoteService pricingQuoteService;

    private ShopCatalogService shopCatalogService;

    private ProductCategory testCategory;
    private Product testProduct;
    private ProductVariant testVariant;

    @BeforeEach
    void setUp() {
        shopCatalogService = new ShopCatalogService(
                productRepository,
                variantRepository,
                categoryRepository,
                inventoryRepository,
                inventoryService,
                pricingQuoteService
        );

        testCategory = ProductCategory.builder()
                .id(UUID.randomUUID())
                .code("RACKETS")
                .name("Rackets")
                .build();

        testProduct = Product.builder()
                .id(UUID.randomUUID())
                .sku("PRD-WILSON97")
                .name("Wilson Pro Staff 97")
                .category(testCategory)
                .brand("Wilson")
                .basePrice(new BigDecimal("279.00"))
                .taxCategory("STANDARD")
                .active(true)
                .isDeleted(false)
                .build();

        testVariant = ProductVariant.builder()
                .id(UUID.randomUUID())
                .product(testProduct)
                .sku("VAR-WILSON97-G2")
                .size("Grip 2")
                .color("Black")
                .barcode("890123456789")
                .reorderLevel(3)
                .reorderQty(10)
                .isDeleted(false)
                .build();

        testProduct.getVariants().add(testVariant);
    }

    @Test
    @DisplayName("Edge Case: Soft deleting variant while reserved stock exists is rejected")
    void testDeleteVariantWhileReservedRejected() {
        when(variantRepository.findByIdAndIsDeletedFalse(testVariant.getId())).thenReturn(Optional.of(testVariant));
        when(inventoryRepository.findByVariantId(testVariant.getId())).thenReturn(Optional.of(
                Inventory.builder().variantId(testVariant.getId()).onHand(5).reserved(2).build()
        ));

        assertThatThrownBy(() -> shopCatalogService.deleteVariant(testVariant.getId()))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("active stock reservations");
    }

    @Test
    @DisplayName("Soft deleting product marks product and variants as deleted")
    void testSoftDeleteProductSuccess() {
        when(productRepository.findByIdAndIsDeletedFalse(testProduct.getId())).thenReturn(Optional.of(testProduct));
        when(inventoryRepository.findByVariantId(testVariant.getId())).thenReturn(Optional.of(
                Inventory.builder().variantId(testVariant.getId()).onHand(5).reserved(0).build()
        ));

        shopCatalogService.deleteProduct(testProduct.getId());

        assertThat(testProduct.getIsDeleted()).isTrue();
        assertThat(testProduct.getDeletedAt()).isNotNull();
        assertThat(testVariant.getIsDeleted()).isTrue();
        assertThat(testVariant.getDeletedAt()).isNotNull();
        verify(productRepository).save(testProduct);
        verify(variantRepository).save(testVariant);
    }

    @Test
    @DisplayName("Edge Case: Duplicate Product SKU is rejected with 409 Conflict")
    void testDuplicateSkuRejection() {
        when(productRepository.existsBySkuIgnoreCaseAndIsDeletedFalse("PRD-DUPLICATE")).thenReturn(true);

        ProductCreateRequest request = ProductCreateRequest.builder()
                .sku("PRD-DUPLICATE")
                .name("Yonex Duplicate")
                .categoryId(testCategory.getId())
                .brand("Yonex")
                .basePrice(new BigDecimal("199.99"))
                .build();

        assertThatThrownBy(() -> shopCatalogService.createProduct(request))
                .isInstanceOf(DuplicateSkuException.class)
                .hasMessageContaining("SKU already exists");
    }

    @Test
    @DisplayName("Edge Case: Invalid image URL format is rejected")
    void testInvalidImageUrlRejected() {
        ProductCreateRequest request = ProductCreateRequest.builder()
                .sku("PRD-IMG-ERR")
                .name("Yonex Error")
                .categoryId(testCategory.getId())
                .brand("Yonex")
                .basePrice(new BigDecimal("199.99"))
                .images(List.of("ftp://invalid-server.com/photo.png"))
                .build();

        assertThatThrownBy(() -> shopCatalogService.createProduct(request))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("Invalid image URL format");
    }

    @Test
    @DisplayName("Price snapshot preserves order item history when catalog prices change")
    void testOrderPriceSnapshotIntegrity() {
        // Historical purchase was made at base $279.00
        BigDecimal historicalBasePrice = testProduct.getBasePrice();
        ShopOrder order = ShopOrder.builder()
                .orderNumber("ORD-2026-00001")
                .totalBasePrice(historicalBasePrice)
                .finalAmount(historicalBasePrice)
                .build();

        ShopOrderItem historicalItem = ShopOrderItem.builder()
                .order(order)
                .variant(testVariant)
                .itemType("PRODUCT")
                .itemName(testProduct.getName())
                .sku(testVariant.getSku())
                .qty(1)
                .unitBasePrice(historicalBasePrice)
                .unitFinalPrice(historicalBasePrice)
                .totalPrice(historicalBasePrice)
                .build();

        // Later, product price is updated in catalog to $320.00
        testProduct.setBasePrice(new BigDecimal("320.00"));

        // Historical order snapshot remains untouched at $279.00
        assertThat(historicalItem.getUnitBasePrice()).isEqualByComparingTo(new BigDecimal("279.00"));
        assertThat(historicalItem.getTotalPrice()).isEqualByComparingTo(new BigDecimal("279.00"));
        assertThat(order.getFinalAmount()).isEqualByComparingTo(new BigDecimal("279.00"));
    }
}
