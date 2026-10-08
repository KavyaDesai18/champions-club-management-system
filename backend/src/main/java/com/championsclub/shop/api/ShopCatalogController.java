package com.championsclub.shop.api;

import com.championsclub.shop.domain.ProductCategory;
import com.championsclub.shop.dto.*;
import com.championsclub.shop.service.PricingQuoteService;
import com.championsclub.shop.service.ShopCatalogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/v1/shop")
@RequiredArgsConstructor
@Tag(name = "Shop Catalog", description = "Endpoints for public product catalog, categories, price quotes, and staff product management")
public class ShopCatalogController {

    private final ShopCatalogService shopCatalogService;
    private final PricingQuoteService pricingQuoteService;

    // --- Public Endpoints (No Auth, Cached, Redacted Stock) ---

    @GetMapping("/catalog")
    @Operation(summary = "Public product catalog", description = "Cached public catalog hiding cost and exact stock; shows stock badges only")
    public ResponseEntity<Page<CatalogProductResponse>> getPublicCatalog(
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)));
        Page<CatalogProductResponse> results = shopCatalogService.getPublicCatalog(categoryId, brand, search, pageable);

        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(60, TimeUnit.SECONDS).cachePublic())
                .body(results);
    }

    @GetMapping("/categories")
    @Operation(summary = "List all product categories")
    public ResponseEntity<List<ProductCategory>> getCategories() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(300, TimeUnit.SECONDS).cachePublic())
                .body(shopCatalogService.getAllCategories());
    }

    @GetMapping("/products/{id}")
    @Operation(summary = "Get product by ID (Public view)")
    public ResponseEntity<CatalogProductResponse> getProductById(@PathVariable UUID id) {
        return ResponseEntity.ok(shopCatalogService.getProductById(id, false));
    }

    @PostMapping("/quote")
    @Operation(summary = "Get price quote with plan discount and tax", description = "Returns base, tier discount, tax category, and final amounts")
    public ResponseEntity<PriceQuoteResponse> getPriceQuote(@Valid @RequestBody PriceQuoteRequest request) {
        return ResponseEntity.ok(pricingQuoteService.calculateQuote(request));
    }

    // --- Staff Management Endpoints ---

    @GetMapping("/staff/products")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'SHOP_STAFF')")
    @Operation(summary = "Staff catalog view", description = "Includes cost price, exact on-hand, reserved, and available stock numbers")
    public ResponseEntity<Page<CatalogProductResponse>> getStaffCatalog(
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)));
        return ResponseEntity.ok(shopCatalogService.getStaffCatalog(categoryId, brand, search, pageable));
    }

    @GetMapping("/staff/products/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'SHOP_STAFF')")
    @Operation(summary = "Get product by ID (Staff view with inventory)")
    public ResponseEntity<CatalogProductResponse> getStaffProductById(@PathVariable UUID id) {
        return ResponseEntity.ok(shopCatalogService.getProductById(id, true));
    }

    @PostMapping("/staff/products")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'SHOP_STAFF')")
    @Operation(summary = "Create product with variants and optional initial inventory")
    public ResponseEntity<CatalogProductResponse> createProduct(@Valid @RequestBody ProductCreateRequest request) {
        CatalogProductResponse created = shopCatalogService.createProduct(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/staff/products/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'SHOP_STAFF')")
    @Operation(summary = "Update product details")
    public ResponseEntity<CatalogProductResponse> updateProduct(
            @PathVariable UUID id,
            @Valid @RequestBody ProductUpdateRequest request
    ) {
        return ResponseEntity.ok(shopCatalogService.updateProduct(id, request));
    }

    @DeleteMapping("/staff/products/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Soft delete product (preserves order snapshots and movement ledger)")
    public ResponseEntity<Void> deleteProduct(@PathVariable UUID id) {
        shopCatalogService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/staff/variants/{variantId}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Soft delete individual variant")
    public ResponseEntity<Void> deleteVariant(@PathVariable UUID variantId) {
        shopCatalogService.deleteVariant(variantId);
        return ResponseEntity.noContent().build();
    }
}
