package com.championsclub.shop.api;

import com.championsclub.member.domain.User;
import com.championsclub.shop.dto.BarcodeLookupResponse;
import com.championsclub.shop.dto.QuickSaleRequest;
import com.championsclub.shop.dto.QuickSaleResponse;
import com.championsclub.shop.service.ShopCatalogService;
import com.championsclub.shop.service.ShopPosService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/shop/pos")
@RequiredArgsConstructor
@Tag(name = "Shop POS", description = "Barcode lookup and lightning-fast counter point-of-sale checkout")
public class ShopPosController {

    private final ShopCatalogService shopCatalogService;
    private final ShopPosService shopPosService;

    @GetMapping("/barcode/{barcode}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'SHOP_STAFF', 'FRONT_DESK', 'BAR_STAFF')")
    @Operation(summary = "Barcode lookup for POS scanner", description = "Returns product details, live stock, and member price quote")
    public ResponseEntity<BarcodeLookupResponse> lookupBarcode(
            @PathVariable String barcode,
            @RequestParam(required = false) UUID memberId
    ) {
        return ResponseEntity.ok(shopCatalogService.lookupByBarcode(barcode, memberId));
    }

    @PostMapping("/quick-sale")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'SHOP_STAFF', 'FRONT_DESK', 'BAR_STAFF')")
    @Operation(summary = "Quick sale counter checkout", description = "Sells stock or services within seconds with snapshot pricing")
    public ResponseEntity<QuickSaleResponse> quickSale(
            @Valid @RequestBody QuickSaleRequest request,
            Authentication authentication
    ) {
        User user = extractUser(authentication);
        return ResponseEntity.ok(shopPosService.executeQuickSale(request, user));
    }

    private User extractUser(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return user;
        }
        return null;
    }
}
