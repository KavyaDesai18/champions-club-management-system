package com.championsclub.court.api;

import com.championsclub.common.error.BlackoutConflictException;
import com.championsclub.common.error.GlobalExceptionHandler;
import com.championsclub.common.security.JwtAuthenticationFilter;
import com.championsclub.common.security.JwtTokenProvider;
import com.championsclub.common.security.SecurityConfig;
import com.championsclub.court.domain.CourtStatus;
import com.championsclub.court.domain.SlotState;
import com.championsclub.court.dto.AvailabilityResponse;
import com.championsclub.court.dto.AvailabilitySlotDto;
import com.championsclub.court.dto.BlackoutDto;
import com.championsclub.court.dto.ConflictingBookingDto;
import com.championsclub.court.dto.CourtAvailabilityDto;
import com.championsclub.court.dto.CreateBlackoutRequest;
import com.championsclub.court.dto.HoldSlotRequest;
import com.championsclub.court.dto.HoldSlotResponse;
import com.championsclub.court.dto.PricingQuoteRequest;
import com.championsclub.court.dto.PricingQuoteResponse;
import com.championsclub.court.service.AvailabilityService;
import com.championsclub.court.service.AvailabilitySseHub;
import com.championsclub.court.service.CourtBlackoutService;
import com.championsclub.court.service.CourtManagementService;
import com.championsclub.court.service.PricingResolverService;
import com.championsclub.member.repo.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {PricingController.class, AvailabilityController.class, AdminCourtController.class})
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
class PricingAndAvailabilityControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private Clock clock;

    @MockBean
    private PricingResolverService pricingResolverService;

    @MockBean
    private AvailabilityService availabilityService;

    @MockBean
    private AvailabilitySseHub sseHub;

    @MockBean
    private CourtManagementService courtManagementService;

    @MockBean
    private CourtBlackoutService courtBlackoutService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private UserRepository userRepository;

    @org.junit.jupiter.api.BeforeEach
    void setUpFilter() throws Exception {
        org.mockito.Mockito.doAnswer(invocation -> {
            jakarta.servlet.http.HttpServletRequest req = invocation.getArgument(0);
            jakarta.servlet.http.HttpServletResponse res = invocation.getArgument(1);
            jakarta.servlet.FilterChain chain = invocation.getArgument(2);
            chain.doFilter(req, res);
            return null;
        }).when(jwtAuthenticationFilter).doFilter(any(), any(), any());

        when(clock.instant()).thenReturn(Instant.parse("2026-10-08T10:00:00Z"));
    }

    @Test
    @DisplayName("POST /pricing/quote resolves quote with price and explanation lines")
    void testPostPricingQuote() throws Exception {
        UUID courtId = UUID.randomUUID();
        Instant start = Instant.parse("2026-10-08T17:00:00Z");

        PricingQuoteRequest req = PricingQuoteRequest.builder()
                .courtId(courtId)
                .start(start)
                .build();

        PricingQuoteResponse resp = PricingQuoteResponse.builder()
                .courtId(courtId)
                .courtName("Badminton Court 1")
                .sportName("Badminton")
                .startTime(start)
                .endTime(start.plusSeconds(3600))
                .price(BigDecimal.valueOf(30.00))
                .currency("INR")
                .matchedRuleId(UUID.randomUUID())
                .explanation(List.of("Day: WEEKDAY", "Time: PEAK", "Price: 30.00"))
                .build();

        when(pricingResolverService.calculateQuote(any())).thenReturn(resp);

        mockMvc.perform(post("/pricing/quote")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.courtId").value(courtId.toString()))
                .andExpect(jsonPath("$.price").value(30.00))
                .andExpect(jsonPath("$.explanation[0]").value("Day: WEEKDAY"));
    }

    @Test
    @DisplayName("GET /availability returns court availability grid")
    void testGetAvailability() throws Exception {
        UUID courtId = UUID.randomUUID();
        LocalDate date = LocalDate.of(2026, 10, 8);

        AvailabilitySlotDto slot = AvailabilitySlotDto.builder()
                .startTime(Instant.parse("2026-10-08T06:00:00Z"))
                .endTime(Instant.parse("2026-10-08T07:00:00Z"))
                .localStartTime(LocalTime.of(6, 0))
                .localEndTime(LocalTime.of(7, 0))
                .state(SlotState.AVAILABLE)
                .price(BigDecimal.valueOf(20.00))
                .formattedPrice("₹20.00")
                .build();

        CourtAvailabilityDto courtDto = CourtAvailabilityDto.builder()
                .courtId(courtId)
                .courtName("Badminton Court 1")
                .sportName("Badminton")
                .surface("SYNTHETIC")
                .indoor(true)
                .status(CourtStatus.ACTIVE)
                .slots(List.of(slot))
                .build();

        AvailabilityResponse resp = AvailabilityResponse.builder()
                .date(date)
                .clubTimezone("Asia/Kolkata")
                .facilityClosed(false)
                .courts(List.of(courtDto))
                .build();

        when(availabilityService.getAvailability(eq(date), any(), any(), any())).thenReturn(resp);

        mockMvc.perform(get("/availability")
                        .param("date", "2026-10-08"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.date").value("2026-10-08"))
                .andExpect(jsonPath("$.courts[0].courtName").value("Badminton Court 1"))
                .andExpect(jsonPath("$.courts[0].slots[0].state").value("AVAILABLE"));
    }

    @Test
    @DisplayName("POST /availability/hold temporarily locks slot for 5 minutes")
    void testHoldSlot() throws Exception {
        UUID courtId = UUID.randomUUID();
        Instant start = Instant.parse("2026-10-08T18:00:00Z");
        Instant end = Instant.parse("2026-10-08T19:00:00Z");

        HoldSlotRequest req = HoldSlotRequest.builder()
                .courtId(courtId)
                .startTime(start)
                .endTime(end)
                .build();

        HoldSlotResponse resp = HoldSlotResponse.builder()
                .holdId(UUID.randomUUID())
                .holdToken("HOLD-ABC123XYZ")
                .courtId(courtId)
                .startTime(start)
                .endTime(end)
                .expiresAt(Instant.now().plusSeconds(300))
                .build();

        when(availabilityService.holdSlot(any())).thenReturn(resp);

        mockMvc.perform(post("/availability/hold")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.holdToken").value("HOLD-ABC123XYZ"));
    }

    @Test
    @WithMockUser(roles = "MANAGER")
    @DisplayName("POST /api/v1/admin/blackouts returns 409 Conflict when active booking conflicts exist")
    void testAdminBlackoutConflictReturns409() throws Exception {
        UUID courtId = UUID.randomUUID();
        Instant start = Instant.parse("2026-10-08T18:00:00Z");
        Instant end = Instant.parse("2026-10-08T20:00:00Z");

        CreateBlackoutRequest req = CreateBlackoutRequest.builder()
                .courtId(courtId)
                .startTime(start)
                .endTime(end)
                .reason("Floor Maintenance")
                .confirmCancelAndNotify(false)
                .build();

        ConflictingBookingDto conflict = ConflictingBookingDto.builder()
                .bookingId(UUID.randomUUID())
                .bookingReference("BK-999")
                .courtName("Badminton Court 1")
                .startTime(start)
                .endTime(end)
                .userName("Jane Doe")
                .build();

        when(courtBlackoutService.createBlackout(any(), any()))
                .thenThrow(new BlackoutConflictException("Conflicting bookings found", List.of(conflict)));

        mockMvc.perform(post("/api/v1/admin/blackouts")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("BLACKOUT_BOOKING_CONFLICT"))
                .andExpect(jsonPath("$.conflictingBookings[0].bookingReference").value("BK-999"));
    }
}
