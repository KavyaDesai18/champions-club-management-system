package com.championsclub.crm.api;

import com.championsclub.crm.dto.CreateQuoteRequest;
import com.championsclub.crm.dto.QuoteDto;
import com.championsclub.crm.service.QuoteService;
import com.championsclub.member.domain.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/crm/quotes")
@Tag(name = "CRM Quotations", description = "Quotation builder, PDF generation, and validity handling")
@PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'FRONT_DESK')")
public class QuoteController {

    private final QuoteService quoteService;

    public QuoteController(QuoteService quoteService) {
        this.quoteService = quoteService;
    }

    @PostMapping
    @Operation(summary = "Build and send a new quotation for a lead")
    public ResponseEntity<QuoteDto> createQuote(
            @Valid @RequestBody CreateQuoteRequest request,
            Authentication authentication
    ) {
        User actor = authentication != null && authentication.getPrincipal() instanceof User u ? u : null;
        return ResponseEntity.ok(quoteService.createQuote(request, actor));
    }

    @GetMapping("/lead/{leadId}")
    @Operation(summary = "Get all quotes generated for a specific lead")
    public ResponseEntity<List<QuoteDto>> getQuotesForLead(@PathVariable UUID leadId) {
        return ResponseEntity.ok(quoteService.getQuotesForLead(leadId));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get details of a specific quotation")
    public ResponseEntity<QuoteDto> getQuoteById(@PathVariable UUID id) {
        return ResponseEntity.ok(quoteService.getQuoteById(id));
    }

    @PostMapping("/{id}/accept")
    @Operation(summary = "Mark quotation as accepted (before validity expires)")
    public ResponseEntity<QuoteDto> acceptQuote(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        User actor = authentication != null && authentication.getPrincipal() instanceof User u ? u : null;
        return ResponseEntity.ok(quoteService.acceptQuote(id, actor));
    }

    @GetMapping(value = "/{id}/pdf", produces = MediaType.TEXT_PLAIN_VALUE)
    @Operation(summary = "Download or view quotation PDF/document stub")
    public ResponseEntity<byte[]> getQuotePdf(@PathVariable UUID id) {
        String pdfContent = quoteService.generatePdfStub(id);
        byte[] bytes = pdfContent.getBytes(StandardCharsets.UTF_8);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"quotation-" + id + ".txt\"")
                .contentType(MediaType.TEXT_PLAIN)
                .body(bytes);
    }
}
