package com.championsclub.crm.service;

import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.crm.domain.Lead;
import com.championsclub.crm.domain.LeadActivity;
import com.championsclub.crm.domain.LeadActivityType;
import com.championsclub.crm.domain.LeadStatus;
import com.championsclub.crm.domain.Quote;
import com.championsclub.crm.domain.QuoteStatus;
import com.championsclub.crm.dto.CreateQuoteRequest;
import com.championsclub.crm.dto.QuoteDto;
import com.championsclub.crm.dto.QuoteLineDto;
import com.championsclub.crm.repo.LeadActivityRepository;
import com.championsclub.crm.repo.LeadRepository;
import com.championsclub.crm.repo.QuoteRepository;
import com.championsclub.member.domain.User;
import com.championsclub.notification.domain.NotificationType;
import com.championsclub.notification.service.NotificationDispatcher;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class QuoteService {

    private static final Logger log = LoggerFactory.getLogger(QuoteService.class);

    private final QuoteRepository quoteRepository;
    private final LeadRepository leadRepository;
    private final LeadActivityRepository activityRepository;
    private final NotificationDispatcher notificationDispatcher;
    private final ObjectMapper objectMapper;
    private final JdbcTemplate jdbcTemplate;

    private final AtomicLong fallbackQuoteSeq = new AtomicLong(2001);

    public QuoteService(
            QuoteRepository quoteRepository,
            LeadRepository leadRepository,
            LeadActivityRepository activityRepository,
            NotificationDispatcher notificationDispatcher,
            ObjectMapper objectMapper,
            JdbcTemplate jdbcTemplate
    ) {
        this.quoteRepository = quoteRepository;
        this.leadRepository = leadRepository;
        this.activityRepository = activityRepository;
        this.notificationDispatcher = notificationDispatcher;
        this.objectMapper = objectMapper;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public QuoteDto createQuote(CreateQuoteRequest request, User actor) {
        Lead lead = leadRepository.findById(request.getLeadId())
                .orElseThrow(() -> new ResourceNotFoundException("Lead not found with id: " + request.getLeadId()));

        if (request.getLines() == null || request.getLines().isEmpty()) {
            throw new BusinessValidationException("Quote must contain at least one line item.", "EMPTY_QUOTE_LINES");
        }

        BigDecimal subtotal = BigDecimal.ZERO;
        List<QuoteLineDto> processedLines = new ArrayList<>();

        for (QuoteLineDto line : request.getLines()) {
            int qty = Math.max(1, line.getQuantity());
            BigDecimal unitPrice = line.getUnitPrice() != null ? line.getUnitPrice() : BigDecimal.ZERO;
            BigDecimal lineAmount = unitPrice.multiply(BigDecimal.valueOf(qty)).setScale(2, RoundingMode.HALF_UP);
            subtotal = subtotal.add(lineAmount);

            processedLines.add(QuoteLineDto.builder()
                    .description(line.getDescription().trim())
                    .quantity(qty)
                    .unitPrice(unitPrice)
                    .amount(lineAmount)
                    .build());
        }

        BigDecimal taxRate = request.getTaxRate() != null ? request.getTaxRate() : BigDecimal.valueOf(0.18);
        BigDecimal tax = subtotal.multiply(taxRate).setScale(2, RoundingMode.HALF_UP);
        BigDecimal total = subtotal.add(tax).setScale(2, RoundingMode.HALF_UP);

        int validityDays = request.getValidityDays() != null && request.getValidityDays() > 0 ? request.getValidityDays() : 14;
        Instant validUntil = Instant.now().plus(Duration.ofDays(validityDays));

        String quoteNumber = generateQuoteNumber();

        String linesJson;
        try {
            linesJson = objectMapper.writeValueAsString(processedLines);
        } catch (Exception e) {
            log.error("Failed to serialize quote lines: {}", e.getMessage());
            linesJson = "[]";
        }

        UUID quoteId = UUID.randomUUID();
        String pdfUrl = "/api/v1/crm/quotes/" + quoteId + "/pdf";

        Quote quote = Quote.builder()
                .id(quoteId)
                .leadId(lead.getId())
                .quoteNumber(quoteNumber)
                .lines(linesJson)
                .subtotal(subtotal)
                .tax(tax)
                .total(total)
                .validUntil(validUntil)
                .status(QuoteStatus.SENT)
                .pdfUrl(pdfUrl)
                .notes(request.getNotes())
                .createdBy(actor)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        quote = quoteRepository.save(quote);

        // Update Lead status to QUOTE_SENT
        lead.setStatus(LeadStatus.QUOTE_SENT);
        lead.setUpdatedAt(Instant.now());
        leadRepository.save(lead);

        // Record activity
        String performer = actor != null ? actor.getFullName() : "Staff";
        LeadActivity activity = LeadActivity.builder()
                .leadId(lead.getId())
                .type(LeadActivityType.QUOTE_CREATED)
                .details("Generated and sent Quote " + quoteNumber + " for ₹" + total + " (Valid for " + validityDays + " days).")
                .performedBy(actor)
                .performerName(performer)
                .createdAt(Instant.now())
                .build();
        activityRepository.save(activity);

        // Send Quote Email stub to Lead
        if (lead.getEmail() != null) {
            try {
                log.info("Dispatching quotation email stub to {} for {}", lead.getEmail(), quoteNumber);
            } catch (Exception ex) {
                log.warn("Quotation email dispatch failed: {}", ex.getMessage());
            }
        }

        return mapToDto(quote, lead.getName());
    }

    private String generateQuoteNumber() {
        try {
            Long seq = jdbcTemplate.queryForObject("SELECT nextval('quote_no_seq')", Long.class);
            return String.format("QT-2026-%04d", seq);
        } catch (Exception e) {
            return String.format("QT-2026-%04d", fallbackQuoteSeq.getAndIncrement());
        }
    }

    @Transactional(readOnly = true)
    public List<QuoteDto> getQuotesForLead(UUID leadId) {
        Lead lead = leadRepository.findById(leadId).orElse(null);
        String leadName = lead != null ? lead.getName() : "Lead";
        return quoteRepository.findByLeadIdOrderByCreatedAtDesc(leadId)
                .stream()
                .map(q -> mapToDto(q, leadName))
                .toList();
    }

    @Transactional(readOnly = true)
    public QuoteDto getQuoteById(UUID quoteId) {
        Quote quote = quoteRepository.findById(quoteId)
                .orElseThrow(() -> new ResourceNotFoundException("Quote not found with id: " + quoteId));
        Lead lead = leadRepository.findById(quote.getLeadId()).orElse(null);
        String leadName = lead != null ? lead.getName() : "Lead";
        return mapToDto(quote, leadName);
    }

    @Transactional
    public QuoteDto acceptQuote(UUID quoteId, User actor) {
        Quote quote = quoteRepository.findById(quoteId)
                .orElseThrow(() -> new ResourceNotFoundException("Quote not found with id: " + quoteId));

        if (quote.getValidUntil().isBefore(Instant.now())) {
            quote.setStatus(QuoteStatus.EXPIRED);
            quoteRepository.save(quote);
            throw new BusinessValidationException(
                    "This quotation has expired and can no longer be accepted. Please generate a new quote.",
                    "QUOTE_EXPIRED"
            );
        }

        quote.setStatus(QuoteStatus.ACCEPTED);
        quote.setUpdatedAt(Instant.now());
        final Quote savedQuote = quoteRepository.save(quote);

        // Update lead status
        leadRepository.findById(savedQuote.getLeadId()).ifPresent(lead -> {
            lead.setStatus(LeadStatus.WON);
            lead.setUpdatedAt(Instant.now());
            leadRepository.save(lead);

            String performer = actor != null ? actor.getFullName() : "Staff";
            LeadActivity activity = LeadActivity.builder()
                    .leadId(lead.getId())
                    .type(LeadActivityType.STATUS_CHANGE)
                    .details("Quotation " + savedQuote.getQuoteNumber() + " accepted by client.")
                    .performedBy(actor)
                    .performerName(performer)
                    .createdAt(Instant.now())
                    .build();
            activityRepository.save(activity);
        });

        Lead lead = leadRepository.findById(savedQuote.getLeadId()).orElse(null);
        return mapToDto(savedQuote, lead != null ? lead.getName() : "Lead");
    }

    public String generatePdfStub(UUID quoteId) {
        Quote quote = quoteRepository.findById(quoteId)
                .orElseThrow(() -> new ResourceNotFoundException("Quote not found with id: " + quoteId));
        Lead lead = leadRepository.findById(quote.getLeadId()).orElse(null);

        StringBuilder sb = new StringBuilder();
        sb.append("============================================================\n");
        sb.append("             CHAMPIONS CLUB - OFFICIAL QUOTATION             \n");
        sb.append("============================================================\n");
        sb.append("Quote Number: ").append(quote.getQuoteNumber()).append("\n");
        sb.append("Date:         ").append(quote.getCreatedAt()).append("\n");
        sb.append("Valid Until:  ").append(quote.getValidUntil()).append("\n");
        sb.append("Status:       ").append(quote.getStatus()).append("\n");
        sb.append("Client Name:  ").append(lead != null ? lead.getName() : "N/A").append("\n");
        sb.append("Client Email: ").append(lead != null ? lead.getEmail() : "N/A").append("\n");
        sb.append("Client Phone: ").append(lead != null ? lead.getPhone() : "N/A").append("\n");
        sb.append("------------------------------------------------------------\n");
        sb.append(String.format("%-4s %-32s %-6s %-10s %-10s\n", "#", "Description", "Qty", "Rate", "Amount"));
        sb.append("------------------------------------------------------------\n");

        List<QuoteLineDto> lines = parseLines(quote.getLines());
        int idx = 1;
        for (QuoteLineDto line : lines) {
            sb.append(String.format("%-4d %-32s %-6d ₹%-9.2f ₹%-9.2f\n",
                    idx++,
                    line.getDescription().length() > 30 ? line.getDescription().substring(0, 27) + "..." : line.getDescription(),
                    line.getQuantity(),
                    line.getUnitPrice(),
                    line.getAmount()));
        }
        sb.append("------------------------------------------------------------\n");
        sb.append(String.format("%-44s ₹%-10.2f\n", "Subtotal:", quote.getSubtotal()));
        sb.append(String.format("%-44s ₹%-10.2f\n", "GST Tax (18%):", quote.getTax()));
        sb.append(String.format("%-44s ₹%-10.2f\n", "TOTAL DUE:", quote.getTotal()));
        sb.append("============================================================\n");
        sb.append("Notes & Terms:\n");
        sb.append(quote.getNotes() != null ? quote.getNotes() : "Standard 14-day validity. Prices in INR.").append("\n");
        sb.append("Thank you for choosing Champions Club!\n");

        return sb.toString();
    }

    private QuoteDto mapToDto(Quote q, String leadName) {
        boolean isExpired = q.getValidUntil().isBefore(Instant.now()) && q.getStatus() == QuoteStatus.SENT;
        return QuoteDto.builder()
                .id(q.getId())
                .leadId(q.getLeadId())
                .leadName(leadName)
                .quoteNumber(q.getQuoteNumber())
                .lines(parseLines(q.getLines()))
                .subtotal(q.getSubtotal())
                .tax(q.getTax())
                .total(q.getTotal())
                .validUntil(q.getValidUntil())
                .status(isExpired ? QuoteStatus.EXPIRED : q.getStatus())
                .pdfUrl(q.getPdfUrl())
                .notes(q.getNotes())
                .createdById(q.getCreatedBy() != null ? q.getCreatedBy().getId() : null)
                .createdByName(q.getCreatedBy() != null ? q.getCreatedBy().getFullName() : null)
                .createdAt(q.getCreatedAt())
                .updatedAt(q.getUpdatedAt())
                .expired(isExpired)
                .build();
    }

    private List<QuoteLineDto> parseLines(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<QuoteLineDto>>() {});
        } catch (Exception e) {
            log.error("Failed to parse quote lines json: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}
