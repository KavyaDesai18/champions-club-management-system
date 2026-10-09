package com.championsclub.crm.api;

import com.championsclub.court.dto.AvailabilityResponse;
import com.championsclub.crm.dto.LeadDto;
import com.championsclub.crm.dto.OnlineMembershipPurchaseRequest;
import com.championsclub.crm.dto.PublicCatalogItemDto;
import com.championsclub.crm.dto.PublicEnquiryRequest;
import com.championsclub.crm.dto.PublicPlanDto;
import com.championsclub.crm.dto.PublicPriceDto;
import com.championsclub.crm.dto.PublicTrialBookingRequest;
import com.championsclub.crm.dto.TrialBookingConfirmationDto;
import com.championsclub.crm.service.LeadService;
import com.championsclub.crm.service.PublicApiService;
import com.championsclub.member.dto.Member360Dto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/public", "/public"})
@Tag(name = "Public Website API", description = "Public endpoints for enquiries, trial bookings, and catalog")
public class PublicApiController {

    private final LeadService leadService;
    private final PublicApiService publicApiService;

    public PublicApiController(LeadService leadService, PublicApiService publicApiService) {
        this.leadService = leadService;
        this.publicApiService = publicApiService;
    }

    @PostMapping("/enquiry")
    @Operation(summary = "Submit a public enquiry (contact form)")
    public ResponseEntity<LeadDto> submitEnquiry(
            @Valid @RequestBody PublicEnquiryRequest request,
            HttpServletRequest servletRequest
    ) {
        String clientIp = extractClientIp(servletRequest);
        LeadDto result = leadService.processEnquiry(request, clientIp);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/trial-booking")
    @Operation(summary = "Book a complimentary sports trial session")
    public ResponseEntity<TrialBookingConfirmationDto> bookTrial(
            @Valid @RequestBody PublicTrialBookingRequest request,
            HttpServletRequest servletRequest
    ) {
        String clientIp = extractClientIp(servletRequest);
        TrialBookingConfirmationDto result = publicApiService.bookTrialSession(request, clientIp);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/plans")
    @Operation(summary = "Get public membership plans")
    public ResponseEntity<List<PublicPlanDto>> getPlans() {
        return ResponseEntity.ok(publicApiService.getPublicPlans());
    }

    @GetMapping("/prices")
    @Operation(summary = "Get public transparent court & sports pricing")
    public ResponseEntity<List<PublicPriceDto>> getPrices() {
        return ResponseEntity.ok(publicApiService.getPublicPrices());
    }

    @GetMapping("/availability")
    @Operation(summary = "Get anonymized court availability for public view")
    public ResponseEntity<AvailabilityResponse> getAvailability(
            @RequestParam(value = "date", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(value = "sportId", required = false) UUID sportId
    ) {
        return ResponseEntity.ok(publicApiService.getPublicAvailability(date, sportId));
    }

    @GetMapping("/shop/catalog")
    @Operation(summary = "Get public pro-shop catalog with retail prices")
    public ResponseEntity<List<PublicCatalogItemDto>> getShopCatalog() {
        return ResponseEntity.ok(publicApiService.getPublicShopCatalog());
    }

    @PostMapping("/membership-purchase")
    @Operation(summary = "Self-serve online membership purchase")
    public ResponseEntity<Member360Dto> purchaseMembership(
            @Valid @RequestBody OnlineMembershipPurchaseRequest request,
            HttpServletRequest servletRequest
    ) {
        String clientIp = extractClientIp(servletRequest);
        Member360Dto member = publicApiService.purchaseMembershipOnline(request, clientIp);
        return ResponseEntity.ok(member);
    }

    private String extractClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "127.0.0.1";
    }
}
