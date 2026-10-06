package com.championsclub.auth.api;

import com.championsclub.common.security.JwtAuthenticationFilter;
import com.championsclub.common.security.JwtTokenProvider;
import com.championsclub.common.time.ClubTimeUtils;
import com.championsclub.common.time.TimeConfiguration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = PublicDiscoveryController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(TimeConfiguration.class)
class PublicDiscoveryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ClubTimeUtils timeUtils;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    @DisplayName("Public health endpoint returns UP status and club timezone details")
    void testPublicHealthEndpoint() throws Exception {
        when(timeUtils.getClubZoneId()).thenReturn(ZoneId.of("Asia/Kolkata"));
        when(timeUtils.now()).thenReturn(Instant.parse("2026-10-06T12:00:00Z"));
        when(timeUtils.currentClubDate()).thenReturn(LocalDate.of(2026, 10, 6));

        mockMvc.perform(get("/api/v1/public/health")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.club").value("Champions Club"))
                .andExpect(jsonPath("$.timezone").value("Asia/Kolkata"))
                .andExpect(jsonPath("$.serverTimeUtc").value("2026-10-06T12:00:00Z"))
                .andExpect(jsonPath("$.clubDate").value("2026-10-06"));
    }
}
