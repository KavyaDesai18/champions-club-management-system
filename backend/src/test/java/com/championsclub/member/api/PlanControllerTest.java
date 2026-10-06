package com.championsclub.member.api;

import com.championsclub.common.error.GlobalExceptionHandler;
import com.championsclub.common.security.JwtAuthenticationFilter;
import com.championsclub.common.security.JwtTokenProvider;
import com.championsclub.common.security.SecurityConfig;
import com.championsclub.member.domain.Plan;
import com.championsclub.member.dto.PlanDto;
import com.championsclub.member.repo.UserRepository;
import com.championsclub.member.service.PlanService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = PlanController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
class PlanControllerTest {

    @Autowired private MockMvc mockMvc;

    @MockBean private PlanService planService;
    @MockBean private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockBean private JwtTokenProvider jwtTokenProvider;
    @MockBean private UserRepository userRepository;
    @MockBean private Clock clock;

    @BeforeEach
    void setUpFilter() throws Exception {
        doAnswer(invocation -> {
            jakarta.servlet.http.HttpServletRequest req = invocation.getArgument(0);
            jakarta.servlet.http.HttpServletResponse res = invocation.getArgument(1);
            jakarta.servlet.FilterChain chain = invocation.getArgument(2);
            chain.doFilter(req, res);
            return null;
        }).when(jwtAuthenticationFilter).doFilter(any(), any(), any());

        when(clock.instant()).thenReturn(Instant.now());
    }

    @Test
    @DisplayName("GET /api/v1/plans: Publicly accessible without authentication (200 OK)")
    void publicCanListPlans() throws Exception {
        PlanDto gold = PlanDto.builder()
                .id(UUID.randomUUID())
                .code("GOLD")
                .name("Gold VIP")
                .price(BigDecimal.valueOf(2999))
                .benefits(List.of("14-Day Advance Booking", "25% Court Discount"))
                .build();

        when(planService.getAllActivePlans()).thenReturn(List.of(gold));

        mockMvc.perform(get("/api/v1/plans"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].code").value("GOLD"))
                .andExpect(jsonPath("$[0].benefits[0]").value("14-Day Advance Booking"));
    }

    @Test
    @DisplayName("GET /api/v1/plans/{code}: Publicly accessible single plan (200 OK)")
    void publicCanGetSinglePlan() throws Exception {
        Plan plan = Plan.builder()
                .id(UUID.randomUUID())
                .code("JUNIOR")
                .name("Junior Cadet")
                .price(BigDecimal.valueOf(999))
                .build();

        when(planService.getPlanByCode("JUNIOR")).thenReturn(plan);

        mockMvc.perform(get("/api/v1/plans/JUNIOR"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("JUNIOR"));
    }
}
