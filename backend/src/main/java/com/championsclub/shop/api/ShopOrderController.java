package com.championsclub.shop.api;

import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.member.domain.Member;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.MemberRepository;
import com.championsclub.shop.dto.*;
import com.championsclub.shop.service.ShopOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/shop")
@RequiredArgsConstructor
@Tag(name = "Shop Orders & Cart", description = "Member cart management, online checkout, payment and order tracking")
public class ShopOrderController {

    private final ShopOrderService shopOrderService;
    private final MemberRepository memberRepository;

    @GetMapping("/cart")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get active member cart with live stock warnings and price difference audit")
    public ResponseEntity<CartResponse> getCart(
            @RequestParam(required = false) UUID memberId,
            Authentication authentication
    ) {
        UUID effectiveMemberId = resolveMemberId(memberId, authentication);
        return ResponseEntity.ok(shopOrderService.getOrCreateCart(effectiveMemberId));
    }

    @PostMapping("/cart/items")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Add product or service item to member cart")
    public ResponseEntity<CartResponse> addItemToCart(
            @RequestParam(required = false) UUID memberId,
            @Valid @RequestBody CartItemRequest request,
            Authentication authentication
    ) {
        UUID effectiveMemberId = resolveMemberId(memberId, authentication);
        return ResponseEntity.ok(shopOrderService.addItemToCart(effectiveMemberId, request));
    }

    @PutMapping("/cart/items/{orderItemId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update cart item quantity (0 removes item)")
    public ResponseEntity<CartResponse> updateItemQty(
            @PathVariable UUID orderItemId,
            @RequestParam(required = false) UUID memberId,
            @RequestBody Map<String, Integer> body,
            Authentication authentication
    ) {
        UUID effectiveMemberId = resolveMemberId(memberId, authentication);
        int qty = body != null && body.containsKey("qty") ? body.get("qty") : 1;
        return ResponseEntity.ok(shopOrderService.updateCartItemQty(effectiveMemberId, orderItemId, qty));
    }

    @DeleteMapping("/cart/items/{orderItemId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Remove item line from cart")
    public ResponseEntity<CartResponse> removeItem(
            @PathVariable UUID orderItemId,
            @RequestParam(required = false) UUID memberId,
            Authentication authentication
    ) {
        UUID effectiveMemberId = resolveMemberId(memberId, authentication);
        return ResponseEntity.ok(shopOrderService.removeCartItem(effectiveMemberId, orderItemId));
    }

    @DeleteMapping("/cart")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Clear all items in active cart")
    public ResponseEntity<CartResponse> clearCart(
            @RequestParam(required = false) UUID memberId,
            Authentication authentication
    ) {
        UUID effectiveMemberId = resolveMemberId(memberId, authentication);
        return ResponseEntity.ok(shopOrderService.clearCart(effectiveMemberId));
    }

    @PostMapping("/checkout")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Place order from active cart (atomically reserves inventory)")
    public ResponseEntity<OrderResponse> checkout(
            @RequestParam(required = false) UUID memberId,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyHeader,
            @Valid @RequestBody CheckoutRequest request,
            Authentication authentication
    ) {
        UUID effectiveMemberId = resolveMemberId(memberId, authentication);
        if (idempotencyHeader != null && !idempotencyHeader.isBlank() && request.getIdempotencyKey() == null) {
            request.setIdempotencyKey(idempotencyHeader.trim());
        }
        User user = extractUser(authentication);
        OrderResponse response = shopOrderService.placeOrder(effectiveMemberId, request, user);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/orders/{id}/pay")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Confirm payment for placed order (converts reserved inventory to confirmed sale)")
    public ResponseEntity<OrderResponse> payOrder(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body,
            Authentication authentication
    ) {
        String paymentMethod = body != null ? body.get("paymentMethod") : "WALLET";
        String paymentRef = body != null ? body.get("paymentReference") : "PAY-" + System.currentTimeMillis();
        User user = extractUser(authentication);
        return ResponseEntity.ok(shopOrderService.payOrder(id, paymentMethod, paymentRef, user));
    }

    @GetMapping("/orders/my")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get caller's placed/fulfilled order history")
    public ResponseEntity<List<OrderResponse>> getMyOrders(
            @RequestParam(required = false) UUID memberId,
            Authentication authentication
    ) {
        UUID effectiveMemberId = resolveMemberId(memberId, authentication);
        return ResponseEntity.ok(shopOrderService.getMemberOrders(effectiveMemberId));
    }

    @GetMapping("/orders/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get order details by order ID")
    public ResponseEntity<OrderResponse> getOrderById(@PathVariable UUID id) {
        return ResponseEntity.ok(shopOrderService.getOrderById(id));
    }

    @GetMapping("/orders/number/{orderNo}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get order details by human-readable order number")
    public ResponseEntity<OrderResponse> getOrderByNumber(@PathVariable String orderNo) {
        return ResponseEntity.ok(shopOrderService.getOrderByOrderNo(orderNo));
    }

    private UUID resolveMemberId(UUID explicitMemberId, Authentication authentication) {
        if (explicitMemberId != null) {
            return explicitMemberId;
        }
        User user = extractUser(authentication);
        if (user != null) {
            Member member = memberRepository.findByUserIdAndIsDeletedFalse(user.getId())
                    .orElseGet(() -> memberRepository.findByEmailAndIsDeletedFalse(user.getEmail()).orElse(null));
            if (member != null) {
                return member.getId();
            }
        }
        throw new ResourceNotFoundException("Active Member profile not linked to current user session");
    }

    private User extractUser(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return user;
        }
        return null;
    }
}
