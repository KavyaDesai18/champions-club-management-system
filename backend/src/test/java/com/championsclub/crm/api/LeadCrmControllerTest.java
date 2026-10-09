package com.championsclub.crm.api;

import com.championsclub.common.error.GlobalExceptionHandler;
import com.championsclub.common.security.JwtAuthenticationFilter;
import com.championsclub.common.security.JwtTokenProvider;
import com.championsclub.common.security.SecurityConfig;
import com.championsclub.crm.domain.LeadActivityType;
import com.championsclub.crm.domain.LeadStatus;
import com.championsclub.crm.domain.QuoteStatus;
import com.championsclub.crm.dto.AddLeadActivityRequest;
import com.championsclub.crm.dto.ConvertLeadRequest;
import com.championsclub.crm.dto.CreateQuoteRequest;
import com.championsclub.crm.dto.CrmFunnelStatsDto;
import com.championsclub.crm.dto.LeadActivityDto;
import com.championsclub.crm.dto.LeadDto;
import com.championsclub.crm.dto.QuoteDto;
import com.championsclub.crm.dto.QuoteLineDto;
import com.championsclub.crm.dto.UpdateLeadStatusRequest;
import com.championsclub.crm.service.LeadService;
import com.championsclub.crm.service.QuoteService;
import com.championsclub.member.repo.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {LeadCrmController.class, QuoteController.class})
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
class LeadCrmControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private LeadService leadService;

    @MockBean
    private QuoteService quoteService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private java.time.Clock clock;

    @org.junit.jupiter.api.BeforeEach
    void setUpFilter() throws Exception {
        org.mockito.Mockito.doAnswer(invocation -> {
            jakarta.servlet.http.HttpServletRequest req = invocation.getArgument(0);
            jakarta.servlet.http.HttpServletResponse res = invocation.getArgument(1);
            jakarta.servlet.FilterChain chain = invocation.getArgument(2);
            chain.doFilter(req, res);
            return null;
        }).when(jwtAuthenticationFilter).doFilter(any(), any(), any());

        when(clock.instant()).thenReturn(Instant.now());
    }

    @Test
    @DisplayName("GET /api/v1/crm/leads - unauthenticated access is rejected with 401")
    void testUnauthenticatedAccessRejected() throws Exception {
        mockMvc.perform(get("/api/v1/crm/leads"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "FRONT_DESK")
    @DisplayName("GET /api/v1/crm/leads - staff lists leads successfully")
    void testStaffListLeads() throws Exception {
        LeadDto lead = LeadDto.builder()
                .id(UUID.randomUUID())
                .name("Arjun Sharma")
                .status(LeadStatus.NEW)
                .build();

        when(leadService.getLeads(any(), any())).thenReturn(List.of(lead));

        mockMvc.perform(get("/api/v1/crm/leads"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Arjun Sharma"));
    }

    @Test
    @WithMockUser(roles = "FRONT_DESK")
    @DisplayName("GET /api/v1/crm/leads/funnel - staff views pipeline funnel stats")
    void testStaffViewFunnelStats() throws Exception {
        CrmFunnelStatsDto funnel = CrmFunnelStatsDto.builder()
                .totalLeads(40)
                .newCount(10)
                .contactedCount(12)
                .quoteSentCount(8)
                .trialBookedCount(4)
                .wonCount(5)
                .lostCount(1)
                .winRatePercentage(BigDecimal.valueOf(12.5))
                .build();

        when(leadService.getFunnelStats()).thenReturn(funnel);

        mockMvc.perform(get("/api/v1/crm/leads/funnel"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalLeads").value(40))
                .andExpect(jsonPath("$.winRatePercentage").value(12.5));
    }

    @Test
    @WithMockUser(roles = "FRONT_DESK")
    @DisplayName("PUT /api/v1/crm/leads/{id}/status - staff updates lead status")
    void testUpdateLeadStatus() throws Exception {
        UUID leadId = UUID.randomUUID();
        LeadDto updated = LeadDto.builder()
                .id(leadId)
                .name("Arjun Sharma")
                .status(LeadStatus.CONTACTED)
                .build();

        when(leadService.updateLeadStatus(eq(leadId), any(UpdateLeadStatusRequest.class), any()))
                .thenReturn(updated);

        UpdateLeadStatusRequest req = UpdateLeadStatusRequest.builder()
                .status(LeadStatus.CONTACTED)
                .note("Spoke on phone for 10 minutes")
                .build();

        mockMvc.perform(put("/api/v1/crm/leads/" + leadId + "/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONTACTED"));
    }

    @Test
    @WithMockUser(roles = "FRONT_DESK")
    @DisplayName("POST /api/v1/crm/leads/{id}/activities - staff logs activity note")
    void testAddLeadActivity() throws Exception {
        UUID leadId = UUID.randomUUID();
        LeadActivityDto act = LeadActivityDto.builder()
                .id(UUID.randomUUID())
                .leadId(leadId)
                .type(LeadActivityType.NOTE)
                .details("Customer prefers weekend sessions.")
                .build();

        when(leadService.addActivity(eq(leadId), any(AddLeadActivityRequest.class), any()))
                .thenReturn(act);

        AddLeadActivityRequest req = AddLeadActivityRequest.builder()
                .type(LeadActivityType.NOTE)
                .details("Customer prefers weekend sessions.")
                .build();

        mockMvc.perform(post("/api/v1/crm/leads/" + leadId + "/activities")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.details").value("Customer prefers weekend sessions."));
    }

    @Test
    @WithMockUser(roles = "MANAGER")
    @DisplayName("POST /api/v1/crm/leads/{id}/convert - one-click conversion to member")
    void testConvertLeadToMember() throws Exception {
        UUID leadId = UUID.randomUUID();
        UUID memberId = UUID.randomUUID();

        LeadDto wonLead = LeadDto.builder()
                .id(leadId)
                .name("Priya Patel")
                .status(LeadStatus.WON)
                .convertedMemberId(memberId)
                .convertedMemberNo("CC-1099")
                .build();

        when(leadService.convertLeadToMember(eq(leadId), any(ConvertLeadRequest.class), any()))
                .thenReturn(wonLead);

        ConvertLeadRequest req = ConvertLeadRequest.builder()
                .planCode("GOLD")
                .createPortalAccount(true)
                .build();

        mockMvc.perform(post("/api/v1/crm/leads/" + leadId + "/convert")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("WON"))
                .andExpect(jsonPath("$.convertedMemberNo").value("CC-1099"));
    }

    @Test
    @WithMockUser(roles = "OWNER")
    @DisplayName("POST /api/v1/crm/quotes - generates quote and PDF stub")
    void testCreateAndDownloadQuote() throws Exception {
        UUID leadId = UUID.randomUUID();
        UUID quoteId = UUID.randomUUID();

        QuoteDto quoteDto = QuoteDto.builder()
                .id(quoteId)
                .leadId(leadId)
                .quoteNumber("QT-2026-1045")
                .subtotal(BigDecimal.valueOf(10000.00))
                .tax(BigDecimal.valueOf(1800.00))
                .total(BigDecimal.valueOf(11800.00))
                .status(QuoteStatus.SENT)
                .pdfUrl("/api/v1/crm/quotes/" + quoteId + "/pdf")
                .build();

        when(quoteService.createQuote(any(CreateQuoteRequest.class), any()))
                .thenReturn(quoteDto);
        when(quoteService.generatePdfStub(quoteId))
                .thenReturn("CHAMPIONS CLUB QUOTATION\nQuote Number: QT-2026-1045\nTotal: 11800.00");

        CreateQuoteRequest quoteReq = CreateQuoteRequest.builder()
                .leadId(leadId)
                .lines(List.of(QuoteLineDto.builder()
                        .description("Corporate Annual Gold Pass")
                        .quantity(10)
                        .unitPrice(BigDecimal.valueOf(1000.00))
                        .build()))
                .build();

        mockMvc.perform(post("/api/v1/crm/quotes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(quoteReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quoteNumber").value("QT-2026-1045"))
                .andExpect(jsonPath("$.total").value(11800.00));

        // Test PDF download stub
        mockMvc.perform(get("/api/v1/crm/quotes/" + quoteId + "/pdf"))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("QT-2026-1045")));
    }
}
