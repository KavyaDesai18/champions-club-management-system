package com.championsclub.auth.api;

import com.championsclub.auth.dto.AuthResponse;
import com.championsclub.auth.dto.LoginRequest;
import com.championsclub.auth.dto.RefreshTokenRequest;
import com.championsclub.auth.dto.ResetPasswordRequest;
import com.championsclub.auth.dto.TokenRefreshResponse;
import com.championsclub.auth.dto.UserDto;
import com.championsclub.auth.service.AuthService;
import com.championsclub.common.error.ChampionsClubException;
import com.championsclub.common.error.GlobalExceptionHandler;
import com.championsclub.common.security.JwtAuthenticationFilter;
import com.championsclub.common.security.JwtTokenProvider;
import com.championsclub.common.security.Role;
import com.championsclub.common.security.SecurityConfig;
import com.championsclub.member.repo.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AuthController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private Clock clock;

    @org.junit.jupiter.api.BeforeEach
    void setUpFilter() throws Exception {
        org.mockito.Mockito.doAnswer(invocation -> {
            jakarta.servlet.http.HttpServletRequest req = invocation.getArgument(0);
            jakarta.servlet.http.HttpServletResponse res = invocation.getArgument(1);
            jakarta.servlet.FilterChain chain = invocation.getArgument(2);
            chain.doFilter(req, res);
            return null;
        }).when(jwtAuthenticationFilter).doFilter(any(), any(), any());
    }

    @Test
    @DisplayName("POST /api/v1/auth/login returns 200 with tokens on successful authentication")
    void loginSuccess() throws Exception {
        when(clock.instant()).thenReturn(Instant.parse("2026-10-06T12:00:00Z"));

        LoginRequest request = LoginRequest.builder()
                .email("member@championsclub.com")
                .password("Champions@123")
                .build();

        AuthResponse authResponse = AuthResponse.builder()
                .accessToken("mock-access-token")
                .refreshToken("mock-refresh-token")
                .tokenType("Bearer")
                .expiresInSeconds(900)
                .user(UserDto.builder()
                        .id(UUID.randomUUID())
                        .email("member@championsclub.com")
                        .fullName("Alex Athlete")
                        .role(Role.MEMBER)
                        .status("ACTIVE")
                        .build())
                .build();

        when(authService.login(any(LoginRequest.class), any(), any())).thenReturn(authResponse);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("mock-access-token"))
                .andExpect(jsonPath("$.refreshToken").value("mock-refresh-token"))
                .andExpect(jsonPath("$.user.email").value("member@championsclub.com"))
                .andExpect(jsonPath("$.user.role").value("MEMBER"));
    }

    @Test
    @DisplayName("POST /api/v1/auth/login returns 401 on bad credentials with generic message")
    void loginBadCredentials() throws Exception {
        when(clock.instant()).thenReturn(Instant.parse("2026-10-06T12:00:00Z"));

        LoginRequest request = LoginRequest.builder()
                .email("member@championsclub.com")
                .password("WrongPassword")
                .build();

        when(authService.login(any(LoginRequest.class), any(), any()))
                .thenThrow(new BadCredentialsException("Invalid email or password."));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andExpect(jsonPath("$.message").value("Invalid email or password."));
    }

    @Test
    @DisplayName("POST /api/v1/auth/refresh rotates token and returns 200")
    void refreshSuccess() throws Exception {
        RefreshTokenRequest request = RefreshTokenRequest.builder()
                .refreshToken("valid-refresh-token")
                .build();

        TokenRefreshResponse response = TokenRefreshResponse.builder()
                .accessToken("new-access-token")
                .refreshToken("new-refresh-token")
                .tokenType("Bearer")
                .expiresInSeconds(900)
                .build();

        when(authService.refresh(eq("valid-refresh-token"), any(), any())).thenReturn(response);

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("new-access-token"))
                .andExpect(jsonPath("$.refreshToken").value("new-refresh-token"));
    }

    @Test
    @DisplayName("POST /api/v1/auth/refresh returns 401 when token reuse is detected")
    void refreshReuseDetected() throws Exception {
        when(clock.instant()).thenReturn(Instant.parse("2026-10-06T12:00:00Z"));

        RefreshTokenRequest request = RefreshTokenRequest.builder()
                .refreshToken("reused-refresh-token")
                .build();

        when(authService.refresh(eq("reused-refresh-token"), any(), any()))
                .thenThrow(new ChampionsClubException(
                        HttpStatus.UNAUTHORIZED,
                        "REFRESH_TOKEN_REUSE",
                        "Security alert: Refresh token reuse detected."
                ));

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("REFRESH_TOKEN_REUSE"));
    }

    @Test
    @DisplayName("GET /api/v1/auth/me returns 200 for authenticated user")
    @WithMockUser(username = "member@championsclub.com", roles = {"MEMBER"})
    void getMeAuthenticated() throws Exception {
        UserDto userDto = UserDto.builder()
                .id(UUID.randomUUID())
                .email("member@championsclub.com")
                .fullName("Alex Athlete")
                .role(Role.MEMBER)
                .status("ACTIVE")
                .build();

        when(authService.getMe("member@championsclub.com")).thenReturn(userDto);

        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("member@championsclub.com"))
                .andExpect(jsonPath("$.role").value("MEMBER"));
    }
}
