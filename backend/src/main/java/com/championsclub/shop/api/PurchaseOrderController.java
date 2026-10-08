package com.championsclub.shop.api;

import com.championsclub.member.domain.User;
import com.championsclub.shop.dto.PurchaseOrderDto;
import com.championsclub.shop.dto.SupplierBillDto;
import com.championsclub.shop.dto.SupplierDto;
import com.championsclub.shop.service.PurchaseOrderService;
import com.championsclub.shop.service.SupplierService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/shop")
@RequiredArgsConstructor
@Tag(name = "Suppliers & Purchase Orders", description = "Vendor directory, PO lifecycle, partial receipts, auto bills, and suggested reordering")
public class PurchaseOrderController {

    private final PurchaseOrderService poService;
    private final SupplierService supplierService;

    @GetMapping("/suppliers")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'SHOP_STAFF')")
    @Operation(summary = "List all active suppliers")
    public ResponseEntity<List<SupplierDto>> getSuppliers() {
        return ResponseEntity.ok(supplierService.getAllSuppliers());
    }

    @PostMapping("/suppliers")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Create supplier record")
    public ResponseEntity<SupplierDto> createSupplier(@Valid @RequestBody SupplierDto.CreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(supplierService.createSupplier(request));
    }

    @GetMapping("/purchase-orders")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'SHOP_STAFF')")
    @Operation(summary = "List all purchase orders")
    public ResponseEntity<List<PurchaseOrderDto>> getPurchaseOrders() {
        return ResponseEntity.ok(poService.getAllPurchaseOrders());
    }

    @GetMapping("/purchase-orders/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'SHOP_STAFF')")
    @Operation(summary = "Get purchase order by ID")
    public ResponseEntity<PurchaseOrderDto> getPurchaseOrderById(@PathVariable UUID id) {
        return ResponseEntity.ok(poService.getPurchaseOrderById(id));
    }

    @PostMapping("/purchase-orders")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'SHOP_STAFF')")
    @Operation(summary = "Create draft purchase order")
    public ResponseEntity<PurchaseOrderDto> createPurchaseOrder(
            @Valid @RequestBody PurchaseOrderDto.CreateRequest request,
            Authentication authentication
    ) {
        User user = extractUser(authentication);
        return ResponseEntity.status(HttpStatus.CREATED).body(poService.createPurchaseOrder(request, user));
    }

    @PostMapping("/purchase-orders/{id}/send")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'SHOP_STAFF')")
    @Operation(summary = "Send purchase order to vendor")
    public ResponseEntity<PurchaseOrderDto> sendPurchaseOrder(@PathVariable UUID id) {
        return ResponseEntity.ok(poService.sendPurchaseOrder(id));
    }

    @PostMapping("/purchase-orders/{id}/receive")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'SHOP_STAFF')")
    @Operation(summary = "Receive goods on PO (partial receipts allowed)", description = "Auto-creates PURCHASE stock movements and accounts payable bill")
    public ResponseEntity<PurchaseOrderDto> receivePurchaseOrder(
            @PathVariable UUID id,
            @Valid @RequestBody PurchaseOrderDto.ReceiveRequest request,
            Authentication authentication
    ) {
        User user = extractUser(authentication);
        return ResponseEntity.ok(poService.receivePurchaseOrder(id, request, user));
    }

    @PostMapping("/purchase-orders/reorder-suggested")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'SHOP_STAFF')")
    @Operation(summary = "1-Click suggested reorders from active low-stock alerts")
    public ResponseEntity<List<PurchaseOrderDto>> generateSuggestedReorders(Authentication authentication) {
        User user = extractUser(authentication);
        return ResponseEntity.ok(poService.generateSuggestedReorders(user));
    }

    @GetMapping("/bills")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "List all supplier bills (Accounts Payable / what we owe)")
    public ResponseEntity<List<SupplierBillDto>> getSupplierBills() {
        return ResponseEntity.ok(supplierService.getAllBills());
    }

    private User extractUser(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return user;
        }
        return null;
    }
}
