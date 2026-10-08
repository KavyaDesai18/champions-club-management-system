package com.championsclub.shop.service;

import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.member.domain.Member;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.MemberRepository;
import com.championsclub.shop.domain.*;
import com.championsclub.shop.dto.PriceQuoteRequest;
import com.championsclub.shop.dto.PriceQuoteResponse;
import com.championsclub.shop.dto.QuickSaleRequest;
import com.championsclub.shop.dto.QuickSaleResponse;
import com.championsclub.shop.repo.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShopPosService {

    private final ShopOrderRepository orderRepository;
    private final ShopOrderItemRepository orderItemRepository;
    private final ProductVariantRepository variantRepository;
    private final ClubServiceRepository serviceRepository;
    private final MemberRepository memberRepository;
    private final InventoryService inventoryService;
    private final PricingQuoteService pricingQuoteService;

    private static final AtomicInteger ORDER_COUNTER = new AtomicInteger(100);

    /**
     * Executes an atomic quick-sale on the counter within seconds.
     * Generates immutable snapshot line items ensuring future price alterations never touch past orders.
     */
    @Transactional
    public QuickSaleResponse executeQuickSale(QuickSaleRequest request, User cashier) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new BusinessValidationException("Order must contain at least one item", "EMPTY_ORDER");
        }

        Member member = null;
        if (request.getMemberId() != null) {
            member = memberRepository.findByIdAndIsDeletedFalse(request.getMemberId()).orElse(null);
        }

        String customerName = request.getCustomerName();
        if ((customerName == null || customerName.trim().isEmpty()) && member != null) {
            customerName = member.getFullName();
        }
        if (customerName == null || customerName.trim().isEmpty()) {
            customerName = "Counter Walk-in Guest";
        }

        String orderNumber = "ORD-" + LocalDate.now().getYear() + "-" + String.format("%05d", ORDER_COUNTER.incrementAndGet());

        ShopOrder order = ShopOrder.builder()
                .orderNumber(orderNumber)
                .member(member)
                .user(cashier)
                .customerName(customerName)
                .paymentMethod(request.getPaymentMethod() != null ? request.getPaymentMethod() : "CASH")
                .status("COMPLETED")
                .createdBy(cashier)
                .build();

        BigDecimal totalBase = BigDecimal.ZERO;
        BigDecimal totalDiscount = BigDecimal.ZERO;
        BigDecimal totalTax = BigDecimal.ZERO;
        BigDecimal totalFinal = BigDecimal.ZERO;

        List<ShopOrderItem> lineItems = new ArrayList<>();

        for (QuickSaleRequest.QuickSaleItemRequest itemReq : request.getItems()) {
            int qty = (itemReq.getQuantity() != null && itemReq.getQuantity() > 0) ? itemReq.getQuantity() : 1;

            UUID variantId = itemReq.getVariantId();
            UUID serviceId = itemReq.getServiceId();

            // Support direct barcode lookup if variantId not passed directly
            if (variantId == null && itemReq.getBarcode() != null && !itemReq.getBarcode().isBlank()) {
                ProductVariant found = variantRepository.findByBarcodeAndIsDeletedFalse(itemReq.getBarcode().trim())
                        .orElseThrow(() -> new ResourceNotFoundException("No variant found with barcode: " + itemReq.getBarcode()));
                variantId = found.getId();
            }

            // Calculate tier-aware quote for this line
            PriceQuoteResponse quote = pricingQuoteService.calculateQuote(PriceQuoteRequest.builder()
                    .variantId(variantId)
                    .serviceId(serviceId)
                    .quantity(qty)
                    .memberId(member != null ? member.getId() : null)
                    .build());

            ProductVariant variant = null;
            ClubService service = null;

            if (variantId != null) {
                variant = variantRepository.findByIdAndIsDeletedFalse(variantId)
                        .orElseThrow(() -> new ResourceNotFoundException("Variant not found: " + variantId));

                // Atomic stock deduction through ONE single service
                inventoryService.deductStockForSale(
                        variant.getId(),
                        qty,
                        orderNumber,
                        "POS Quick Sale order: " + orderNumber,
                        cashier
                );
            } else if (serviceId != null) {
                service = serviceRepository.findById(serviceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Service not found: " + serviceId));
            }

            // Snapshot record creation
            ShopOrderItem item = ShopOrderItem.builder()
                    .order(order)
                    .variant(variant)
                    .service(service)
                    .itemType(variant != null ? "PRODUCT" : "SERVICE")
                    .itemName(quote.getItemName())
                    .sku(quote.getSku())
                    .qty(qty)
                    .unitBasePrice(quote.getUnitBasePrice())
                    .unitDiscount(quote.getUnitDiscount())
                    .unitTax(quote.getUnitTax())
                    .unitFinalPrice(quote.getUnitFinalPrice())
                    .totalPrice(quote.getTotalFinalPrice())
                    .build();

            lineItems.add(item);

            totalBase = totalBase.add(quote.getTotalBasePrice());
            totalDiscount = totalDiscount.add(quote.getTotalDiscount());
            totalTax = totalTax.add(quote.getTotalTax());
            totalFinal = totalFinal.add(quote.getTotalFinalPrice());
        }

        order.setTotalBasePrice(totalBase);
        order.setTotalDiscount(totalDiscount);
        order.setTotalTax(totalTax);
        order.setFinalAmount(totalFinal);
        order.setItems(lineItems);

        ShopOrder savedOrder = orderRepository.save(order);

        return mapOrderToResponse(savedOrder);
    }

    private QuickSaleResponse mapOrderToResponse(ShopOrder order) {
        List<QuickSaleResponse.QuickSaleItemResponse> items = order.getItems().stream()
                .map(i -> QuickSaleResponse.QuickSaleItemResponse.builder()
                        .itemId(i.getId())
                        .variantId(i.getVariant() != null ? i.getVariant().getId() : null)
                        .serviceId(i.getService() != null ? i.getService().getId() : null)
                        .itemName(i.getItemName())
                        .sku(i.getSku())
                        .quantity(i.getQty())
                        .unitBasePrice(i.getUnitBasePrice())
                        .unitDiscount(i.getUnitDiscount())
                        .unitTax(i.getUnitTax())
                        .unitFinalPrice(i.getUnitFinalPrice())
                        .totalPrice(i.getTotalPrice())
                        .build())
                .collect(Collectors.toList());

        return QuickSaleResponse.builder()
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .customerName(order.getCustomerName())
                .totalBasePrice(order.getTotalBasePrice())
                .totalDiscount(order.getTotalDiscount())
                .totalTax(order.getTotalTax())
                .finalAmount(order.getFinalAmount())
                .status(order.getStatus())
                .paymentMethod(order.getPaymentMethod())
                .createdAt(order.getCreatedAt())
                .items(items)
                .build();
    }
}
