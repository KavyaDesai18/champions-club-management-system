package com.championsclub.crm.api;

import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.DoubleBookingException;
import com.championsclub.common.error.GlobalExceptionHandler;
import com.championsclub.common.security.JwtAuthenticationFilter;
import com.championsclub.common.security.JwtTokenProvider;
import com.championsclub.common.security.SecurityConfig;
import com.championsclub.court.dto.AvailabilityResponse;
import com.championsclub.crm.domain.LeadSource;
import com.championsclub.crm.domain.LeadStatus;
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
import com.championsclub.member.dto.PlanDto;
import com.championsclub.member.repo.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = PublicApiController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
class PublicApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private LeadService leadService;

    @MockBean
    private PublicApiService publicApiService;

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
    @DisplayName("POST /api/v1/public/enquiry - stranger submits enquiry successfully")
    void testSubmitPublicEnquiry() throws Exception {
        UUID leadId = UUID.randomUUID();
        LeadDto responseDto = LeadDto.builder()
                .id(leadId)
                .name("Stranger Enquiry")
                .email("stranger@example.com")
                .phone("+919876543210")
                .status(LeadStatus.NEW)
                .source(LeadSource.WEB_FORM)
                .interest("Badminton")
                .createdAt(Instant.now())
                .build();

        when(leadService.processEnquiry(any(PublicEnquiryRequest.class), anyString()))
                .thenReturn(responseDto);

        PublicEnquiryRequest req = PublicEnquiryRequest.builder()
                .name("Stranger Enquiry")
                .email("stranger@example.com")
                .phone("+919876543210")
                .interest("Badminton")
                .message("I want to know about court pricing and coaching.")
                .build();

        mockMvc.perform(post("/api/v1/public/enquiry")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(leadId.toString()))
                .andExpect(jsonPath("$.name").value("Stranger Enquiry"))
                .andExpect(jsonPath("$.status").value("NEW"));
    }

    @Test
    @DisplayName("POST /api/v1/public/trial-booking - books complimentary trial successfully")
    void testBookTrialSession() throws Exception {
        UUID courtId = UUID.randomUUID();
        TrialBookingConfirmationDto confirm = TrialBookingConfirmationDto.builder()
                .bookingReference("TR-88A91F2D")
                .courtName("Badminton Court 1")
                .sportName("Badminton")
                .date(LocalDate.now().plusDays(2))
                .startTime(LocalTime.of(10, 0))
                .guestName("Trial Visitor")
                .guestPhone("+919988776655")
                .message("Your complimentary trial pass is confirmed!")
                .build();

        when(publicApiService.bookTrialSession(any(PublicTrialBookingRequest.class), anyString()))
                .thenReturn(confirm);

        PublicTrialBookingRequest req = PublicTrialBookingRequest.builder()
                .name("Trial Visitor")
                .email("visitor@example.com")
                .phone("+919988776655")
                .courtId(courtId)
                .date(LocalDate.now().plusDays(2))
                .startTime(LocalTime.of(10, 0))
                .notes("Beginner session")
                .build();

        mockMvc.perform(post("/api/v1/public/trial-booking")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookingReference").value("TR-88A91F2D"))
                .andExpect(jsonPath("$.courtName").value("Badminton Court 1"))
                .andExpect(jsonPath("$.guestName").value("Trial Visitor"));
    }

    @Test
    @DisplayName("POST /api/v1/public/trial-booking - handles slot taken between selection and submit")
    void testTrialSlotTakenConflict() throws Exception {
        when(publicApiService.bookTrialSession(any(PublicTrialBookingRequest.class), anyString()))
                .thenThrow(new DoubleBookingException("The selected court slot is no longer available."));

        PublicTrialBookingRequest req = PublicTrialBookingRequest.builder()
                .name("Trial Visitor")
                .phone("+919988776655")
                .courtId(UUID.randomUUID())
                .date(LocalDate.now().plusDays(2))
                .startTime(LocalTime.of(10, 0))
                .build();

        mockMvc.perform(post("/api/v1/public/trial-booking")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("GET /api/v1/public/plans - returns public membership tiers")
    void testGetPublicPlans() throws Exception {
        PublicPlanDto plan = PublicPlanDto.builder()
                .code("GOLD")
                .name("Gold Tier")
                .price(BigDecimal.valueOf(120.00))
                .highlights(List.of("14-day advance booking", "25% discount"))
                .featured(true)
                .build();

        when(publicApiService.getPublicPlans()).thenReturn(List.of(plan));

        mockMvc.perform(get("/api/v1/public/plans"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].code").value("GOLD"))
                .andExpect(jsonPath("$[0].featured").value(true));
    }

    @Test
    @DisplayName("GET /api/v1/public/prices - returns sports price sheet")
    void testGetPublicPrices() throws Exception {
        PublicPriceDto price = PublicPriceDto.builder()
                .sportName("Tennis")
                .memberHourlyRate(BigDecimal.valueOf(32.00))
                .guestHourlyRate(BigDecimal.valueOf(48.00))
                .courtNames(List.of("Courts 1-4"))
                .build();

        when(publicApiService.getPublicPrices()).thenReturn(List.of(price));

        mockMvc.perform(get("/api/v1/public/prices"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].sportName").value("Tennis"))
                .andExpect(jsonPath("$[0].memberHourlyRate").value(32.00));
    }

    @Test
    @DisplayName("GET /api/v1/public/availability - returns anonymized availability")
    void testGetPublicAvailability() throws Exception {
        AvailabilityResponse resp = AvailabilityResponse.builder()
                .date(LocalDate.now())
                .sportName("Badminton")
                .courts(List.of())
                .build();

        when(publicApiService.getPublicAvailability(any(), any())).thenReturn(resp);

        mockMvc.perform(get("/api/v1/public/availability"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sportName").value("Badminton"));
    }

    @Test
    @DisplayName("GET /api/v1/public/shop/catalog - returns pro-shop retail items")
    void testGetPublicCatalog() throws Exception {
        PublicCatalogItemDto item = PublicCatalogItemDto.builder()
                .id(UUID.randomUUID())
                .name("Yonex Astrox 99 Pro")
                .retailPrice(BigDecimal.valueOf(18500.00))
                .stockStatus("IN_STOCK")
                .build();

        when(publicApiService.getPublicShopCatalog()).thenReturn(List.of(item));

        mockMvc.perform(get("/api/v1/public/shop/catalog"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Yonex Astrox 99 Pro"))
                .andExpect(jsonPath("$[0].retailPrice").value(18500.00));
    }

    @Test
    @DisplayName("POST /api/v1/public/membership-purchase - self-serve online membership purchase")
    void testOnlineMembershipPurchase() throws Exception {
        Member360Dto.ProfileInfo profile = Member360Dto.ProfileInfo.builder()
                .id(UUID.randomUUID())
                .memberNo("CC-2026")
                .fullName("Online Buyer")
                .email("buyer@example.com")
                .status("ACTIVE")
                .build();

        Member360Dto member = Member360Dto.builder()
                .profile(profile)
                .plan(PlanDto.builder().code("SILVER").name("Silver Plan").build())
                .build();

        when(publicApiService.purchaseMembershipOnline(any(OnlineMembershipPurchaseRequest.class), anyString()))
                .thenReturn(member);

        OnlineMembershipPurchaseRequest req = OnlineMembershipPurchaseRequest.builder()
                .name("Online Buyer")
                .email("buyer@example.com")
                .phone("+919876543200")
                .dob(LocalDate.of(1994, 5, 20))
                .planCode("SILVER")
                .paymentMethod("UPI")
                .build();

        mockMvc.perform(post("/api/v1/public/membership-purchase")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profile.memberNo").value("CC-2026"))
                .andExpect(jsonPath("$.profile.status").value("ACTIVE"));
    }
}
