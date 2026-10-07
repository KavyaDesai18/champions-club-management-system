package com.championsclub.court.api;

import com.championsclub.court.dto.PricingQuoteRequest;
import com.championsclub.court.dto.PricingQuoteResponse;
import com.championsclub.court.service.PricingResolverService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Pricing Engine", description = "Deterministic court pricing quote resolution")
public class PricingController {

    private final PricingResolverService pricingResolverService;

    public PricingController(PricingResolverService pricingResolverService) {
        this.pricingResolverService = pricingResolverService;
    }

    @PostMapping({"/pricing/quote", "/api/v1/pricing/quote"})
    @Operation(summary = "Calculate court price quote",
            description = "Deterministically resolves price with highest specificity and priority, returning explanation lines")
    public ResponseEntity<PricingQuoteResponse> getPricingQuote(@Valid @RequestBody PricingQuoteRequest request) {
        PricingQuoteResponse response = pricingResolverService.calculateQuote(request);
        return ResponseEntity.ok(response);
    }
}
