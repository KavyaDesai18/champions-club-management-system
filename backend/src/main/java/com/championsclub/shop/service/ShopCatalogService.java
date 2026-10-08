package com.championsclub.shop.service;

import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.shop.domain.*;
import com.championsclub.shop.dto.*;
import com.championsclub.shop.exception.DuplicateSkuException;
import com.championsclub.shop.repo.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShopCatalogService {

    private final ProductRepository productRepository;
    private final ProductVariantRepository variantRepository;
    private final ProductCategoryRepository categoryRepository;
    private final InventoryRepository inventoryRepository;
    private final InventoryService inventoryService;
    private final PricingQuoteService pricingQuoteService;

    private static final Pattern URL_PATTERN = Pattern.compile("^(https?://|/images/|data:image/).+");

    /**
     * Public catalog: cached, hides cost/stock numbers, returns only In stock / Low stock / Out of stock.
     */
    @Cacheable(value = "publicCatalog", key = "{#categoryId, #brand, #search, #pageable.pageNumber, #pageable.pageSize}")
    @Transactional(readOnly = true)
    public Page<CatalogProductResponse> getPublicCatalog(UUID categoryId, String brand, String search, Pageable pageable) {
        String cleanSearch = sanitizeSearch(search);
        Page<Product> products = productRepository.searchCatalog(categoryId, brand, cleanSearch, pageable);
        return products.map(product -> mapToProductResponse(product, false));
    }

    /**
     * Staff console catalog: includes exact on_hand, reserved, available, cost price, reorder details.
     */
    @Transactional(readOnly = true)
    public Page<CatalogProductResponse> getStaffCatalog(UUID categoryId, String brand, String search, Pageable pageable) {
        String cleanSearch = sanitizeSearch(search);
        Page<Product> products = productRepository.searchCatalog(categoryId, brand, cleanSearch, pageable);
        return products.map(product -> mapToProductResponse(product, true));
    }

    @Transactional(readOnly = true)
    public CatalogProductResponse getProductById(UUID id, boolean isStaff) {
        Product product = productRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + id));
        return mapToProductResponse(product, isStaff);
    }

    @Transactional(readOnly = true)
    public List<CatalogProductResponse.VariantDto> getAllVariants(boolean isStaff) {
        return variantRepository.findAllActiveVariants().stream()
                .map(v -> mapToVariantDto(v, isStaff))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProductCategory> getAllCategories() {
        return categoryRepository.findAllByOrderByDisplayOrderAsc();
    }

    /**
     * Barcode lookup endpoint for POS.
     */
    @Transactional(readOnly = true)
    public BarcodeLookupResponse lookupByBarcode(String barcode, UUID memberId) {
        if (barcode == null || barcode.trim().isEmpty()) {
            throw new BusinessValidationException("Barcode cannot be empty", "INVALID_BARCODE");
        }
        ProductVariant variant = variantRepository.findByBarcodeAndIsDeletedFalse(barcode.trim())
                .orElseThrow(() -> new ResourceNotFoundException("No active product found matching barcode: " + barcode));

        Product product = variant.getProduct();
        Inventory inv = inventoryRepository.findByVariantId(variant.getId()).orElse(null);
        int onHand = (inv != null) ? inv.getOnHand() : 0;
        int reserved = (inv != null) ? inv.getReserved() : 0;
        int available = (inv != null) ? inv.getAvailable() : 0;
        StockStatus status = inventoryService.computeStockStatus(available, variant.getReorderLevel());

        PriceQuoteResponse quote = pricingQuoteService.calculateQuote(PriceQuoteRequest.builder()
                .variantId(variant.getId())
                .quantity(1)
                .memberId(memberId)
                .build());

        return BarcodeLookupResponse.builder()
                .variantId(variant.getId())
                .productId(product.getId())
                .barcode(variant.getBarcode())
                .sku(variant.getSku())
                .productName(product.getName())
                .brand(product.getBrand())
                .categoryName(product.getCategory() != null ? product.getCategory().getName() : "")
                .size(variant.getSize())
                .color(variant.getColor())
                .basePrice(product.getBasePrice())
                .effectivePrice(variant.getEffectivePrice())
                .onHand(onHand)
                .reserved(reserved)
                .available(available)
                .stockStatus(status)
                .priceQuote(quote)
                .build();
    }

    /**
     * Create product with variants and initial stock.
     */
    @CacheEvict(value = "publicCatalog", allEntries = true)
    @Transactional
    public CatalogProductResponse createProduct(ProductCreateRequest request) {
        validateProductRequest(request);

        if (productRepository.existsBySkuIgnoreCaseAndIsDeletedFalse(request.getSku().trim())) {
            throw new DuplicateSkuException("Product with SKU already exists: " + request.getSku());
        }

        ProductCategory category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + request.getCategoryId()));

        Product product = Product.builder()
                .sku(request.getSku().trim())
                .name(request.getName().trim())
                .description(request.getDescription())
                .category(category)
                .brand(request.getBrand().trim())
                .basePrice(request.getBasePrice())
                .taxCategory(request.getTaxCategory() != null ? request.getTaxCategory() : "STANDARD")
                .active(request.getActive() != null ? request.getActive() : true)
                .build();
        product.setImagesList(request.getImages());
        Product savedProduct = productRepository.save(product);

        if (request.getVariants() != null && !request.getVariants().isEmpty()) {
            for (ProductCreateRequest.VariantCreateDto vDto : request.getVariants()) {
                createVariantInternal(savedProduct, vDto);
            }
        }

        return mapToProductResponse(savedProduct, true);
    }

    /**
     * Update product.
     */
    @CacheEvict(value = "publicCatalog", allEntries = true)
    @Transactional
    public CatalogProductResponse updateProduct(UUID id, ProductUpdateRequest request) {
        Product product = productRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + id));

        if (request.getName() != null) product.setName(request.getName().trim());
        if (request.getDescription() != null) product.setDescription(request.getDescription());
        if (request.getBrand() != null) product.setBrand(request.getBrand().trim());
        if (request.getBasePrice() != null) product.setBasePrice(request.getBasePrice());
        if (request.getTaxCategory() != null) product.setTaxCategory(request.getTaxCategory());
        if (request.getActive() != null) product.setActive(request.getActive());
        if (request.getImages() != null) {
            validateImages(request.getImages());
            product.setImagesList(request.getImages());
        }
        if (request.getCategoryId() != null) {
            ProductCategory cat = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + request.getCategoryId()));
            product.setCategory(cat);
        }

        if (request.getVariants() != null && !request.getVariants().isEmpty()) {
            for (ProductCreateRequest.VariantCreateDto vDto : request.getVariants()) {
                if (vDto.getSku() != null && !variantRepository.existsBySkuIgnoreCaseAndIsDeletedFalse(vDto.getSku().trim())) {
                    createVariantInternal(product, vDto);
                }
            }
        }

        Product updated = productRepository.save(product);
        return mapToProductResponse(updated, true);
    }

    /**
     * Soft delete product with history retained.
     */
    @CacheEvict(value = "publicCatalog", allEntries = true)
    @Transactional
    public void deleteProduct(UUID id) {
        Product product = productRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + id));

        // Check whether any variant has active reservations
        for (ProductVariant variant : product.getVariants()) {
            if (!variant.getIsDeleted()) {
                Inventory inv = inventoryRepository.findByVariantId(variant.getId()).orElse(null);
                if (inv != null && inv.getReserved() > 0) {
                    throw new BusinessValidationException("Cannot delete product while variant " + variant.getSku() +
                            " has active reservations (" + inv.getReserved() + " reserved)", "ACTIVE_RESERVATIONS_EXIST");
                }
            }
        }

        // Soft delete all variants
        for (ProductVariant variant : product.getVariants()) {
            variant.setIsDeleted(true);
            variant.setDeletedAt(Instant.now());
            variantRepository.save(variant);
        }

        product.setIsDeleted(true);
        product.setDeletedAt(Instant.now());
        productRepository.save(product);
    }

    /**
     * Soft delete individual variant.
     */
    @CacheEvict(value = "publicCatalog", allEntries = true)
    @Transactional
    public void deleteVariant(UUID variantId) {
        ProductVariant variant = variantRepository.findByIdAndIsDeletedFalse(variantId)
                .orElseThrow(() -> new ResourceNotFoundException("Variant not found: " + variantId));

        Inventory inv = inventoryRepository.findByVariantId(variantId).orElse(null);
        if (inv != null && inv.getReserved() > 0) {
            throw new BusinessValidationException("Cannot delete variant with active stock reservations (" +
                    inv.getReserved() + " reserved)", "VARIANT_HAS_RESERVATIONS");
        }

        variant.setIsDeleted(true);
        variant.setDeletedAt(Instant.now());
        variantRepository.save(variant);
    }

    // --- Helpers ---

    private void createVariantInternal(Product product, ProductCreateRequest.VariantCreateDto vDto) {
        if (variantRepository.existsBySkuIgnoreCaseAndIsDeletedFalse(vDto.getSku().trim())) {
            throw new DuplicateSkuException("Variant SKU already exists: " + vDto.getSku());
        }
        if (vDto.getBarcode() != null && !vDto.getBarcode().trim().isEmpty() &&
                variantRepository.existsByBarcodeIgnoreCaseAndIsDeletedFalse(vDto.getBarcode().trim())) {
            throw new BusinessValidationException("Barcode already in use: " + vDto.getBarcode(), "DUPLICATE_BARCODE");
        }

        ProductVariant variant = ProductVariant.builder()
                .product(product)
                .sku(vDto.getSku().trim())
                .size(vDto.getSize())
                .color(vDto.getColor())
                .priceOverride(vDto.getPriceOverride())
                .barcode(vDto.getBarcode() != null ? vDto.getBarcode().trim() : null)
                .costPrice(vDto.getCostPrice() != null ? vDto.getCostPrice() : BigDecimal.ZERO)
                .reorderLevel(vDto.getReorderLevel() != null ? vDto.getReorderLevel() : 5)
                .reorderQty(vDto.getReorderQty() != null ? vDto.getReorderQty() : 20)
                .build();
        ProductVariant savedVariant = variantRepository.save(variant);

        int initialStock = (vDto.getInitialStock() != null && vDto.getInitialStock() > 0) ? vDto.getInitialStock() : 0;
        Inventory inv = Inventory.builder()
                .variant(savedVariant)
                .variantId(savedVariant.getId())
                .onHand(0)
                .reserved(0)
                .build();
        inventoryRepository.save(inv);

        if (initialStock > 0) {
            inventoryService.restock(savedVariant.getId(), initialStock, variant.getCostPrice(), "INITIAL-OPENING-STOCK", "Initial variant stock balance", null);
        }
    }

    private void validateProductRequest(ProductCreateRequest req) {
        if (req.getBasePrice() == null || req.getBasePrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessValidationException("Base price cannot be negative", "INVALID_PRICE");
        }
        if (req.getImages() != null) {
            validateImages(req.getImages());
        }
    }

    private void validateImages(List<String> images) {
        for (String url : images) {
            if (url != null && !url.trim().isEmpty() && !URL_PATTERN.matcher(url.trim()).matches()) {
                throw new BusinessValidationException("Invalid image URL format: " + url, "INVALID_IMAGE_URL");
            }
        }
    }

    private String sanitizeSearch(String query) {
        if (query == null || query.trim().isEmpty()) return null;
        // Strip SQL wildcard injection chars while preserving valid alphanumeric search tokens
        return query.trim().replaceAll("[%_\\\\]", "");
    }

    private CatalogProductResponse mapToProductResponse(Product product, boolean isStaff) {
        List<ProductVariant> variants = variantRepository.findByProductIdAndIsDeletedFalse(product.getId());

        StockStatus overallStatus = StockStatus.OUT_OF_STOCK;
        if (!variants.isEmpty()) {
            boolean hasInStock = false;
            boolean hasLowStock = false;
            for (ProductVariant v : variants) {
                Inventory inv = inventoryRepository.findByVariantId(v.getId()).orElse(null);
                int available = (inv != null) ? inv.getAvailable() : 0;
                StockStatus s = inventoryService.computeStockStatus(available, v.getReorderLevel());
                if (s == StockStatus.IN_STOCK) hasInStock = true;
                if (s == StockStatus.LOW_STOCK) hasLowStock = true;
            }
            if (hasInStock) overallStatus = StockStatus.IN_STOCK;
            else if (hasLowStock) overallStatus = StockStatus.LOW_STOCK;
        }

        List<CatalogProductResponse.VariantDto> variantDtos = variants.stream()
                .map(v -> mapToVariantDto(v, isStaff))
                .collect(Collectors.toList());

        return CatalogProductResponse.builder()
                .id(product.getId())
                .sku(product.getSku())
                .name(product.getName())
                .description(product.getDescription())
                .category(product.getCategory() != null ? CatalogProductResponse.CategoryDto.builder()
                        .id(product.getCategory().getId())
                        .code(product.getCategory().getCode())
                        .name(product.getCategory().getName())
                        .build() : null)
                .brand(product.getBrand())
                .basePrice(product.getBasePrice())
                .taxCategory(product.getTaxCategory())
                .images(product.getImagesList())
                .active(product.getActive())
                .overallStockStatus(overallStatus)
                .variants(variantDtos)
                .createdAt(product.getCreatedAt())
                .build();
    }

    private CatalogProductResponse.VariantDto mapToVariantDto(ProductVariant v, boolean isStaff) {
        Inventory inv = inventoryRepository.findByVariantId(v.getId()).orElse(null);
        int onHand = (inv != null) ? inv.getOnHand() : 0;
        int reserved = (inv != null) ? inv.getReserved() : 0;
        int available = (inv != null) ? inv.getAvailable() : 0;
        StockStatus status = inventoryService.computeStockStatus(available, v.getReorderLevel());

        CatalogProductResponse.VariantDto.VariantDtoBuilder builder = CatalogProductResponse.VariantDto.builder()
                .id(v.getId())
                .productId(v.getProduct().getId())
                .sku(v.getSku())
                .size(v.getSize())
                .color(v.getColor())
                .priceOverride(v.getPriceOverride())
                .effectivePrice(v.getEffectivePrice())
                .barcode(v.getBarcode())
                .stockStatus(status);

        if (isStaff) {
            builder.onHand(onHand)
                    .reserved(reserved)
                    .available(available)
                    .costPrice(v.getCostPrice())
                    .reorderLevel(v.getReorderLevel())
                    .reorderQty(v.getReorderQty());
        }

        return builder.build();
    }
}
