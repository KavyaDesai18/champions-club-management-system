package com.championsclub.auth;

import com.championsclub.auth.dto.CreateUserRequest;
import com.championsclub.auth.dto.LoginRequest;
import com.championsclub.auth.dto.RefreshTokenRequest;
import com.championsclub.auth.dto.UpdateRoleRequest;
import com.championsclub.auth.dto.UpdateStatusRequest;
import com.championsclub.auth.repo.RefreshTokenRepository;
import com.championsclub.common.security.JwtTokenProvider;
import com.championsclub.common.security.Role;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("champions_auth_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        if (postgres.isRunning()) {
            registry.add("spring.datasource.url", postgres::getJdbcUrl);
            registry.add("spring.datasource.username", postgres::getUsername);
            registry.add("spring.datasource.password", postgres::getPassword);
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private User testOwner;
    private User testManager;
    private User testMember;

    @BeforeEach
    void setupTestData() {
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();

        testOwner = userRepository.save(User.builder()
                .email("owner@testclub.com")
                .passwordHash(passwordEncoder.encode("Champions@123"))
                .fullName("System Owner")
                .role(Role.OWNER)
                .status("ACTIVE")
                .failedAttempts(0)
                .tokenVersion(1)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());

        testManager = userRepository.save(User.builder()
                .email("manager@testclub.com")
                .passwordHash(passwordEncoder.encode("Champions@123"))
                .fullName("Operations Manager")
                .role(Role.MANAGER)
                .status("ACTIVE")
                .failedAttempts(0)
                .tokenVersion(1)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());

        testMember = userRepository.save(User.builder()
                .email("member@testclub.com")
                .passwordHash(passwordEncoder.encode("Champions@123"))
                .fullName("Alex Athlete")
                .role(Role.MEMBER)
                .status("ACTIVE")
                .failedAttempts(0)
                .tokenVersion(1)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());
    }

    private String generateAuthHeader(User user) {
        String token = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail(), user.getRole(), user.getTokenVersion());
        return "Bearer " + token;
    }

    @Nested
    @DisplayName("Authentication Flow Tests")
    class AuthFlows {

        @Test
        @DisplayName("POST /auth/login succeeds with valid credentials and returns tokens")
        void loginSuccess() throws Exception {
            LoginRequest req = LoginRequest.builder()
                    .email("member@testclub.com")
                    .password("Champions@123")
                    .build();

            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.accessToken").isNotEmpty())
                    .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                    .andExpect(jsonPath("$.expiresInSeconds").value(900))
                    .andExpect(jsonPath("$.user.email").value("member@testclub.com"))
                    .andExpect(jsonPath("$.user.role").value("MEMBER"));
        }

        @Test
        @DisplayName("POST /auth/login with wrong password 5 times triggers 15m lockout")
        void lockoutAfterFiveFailures() throws Exception {
            LoginRequest badReq = LoginRequest.builder()
                    .email("member@testclub.com")
                    .password("WrongPassword123")
                    .build();

            // 4 failed attempts
            for (int i = 0; i < 4; i++) {
                mockMvc.perform(post("/api/v1/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(badReq)))
                        .andExpect(status().isUnauthorized())
                        .andExpect(jsonPath("$.message").value("Invalid email or password."));
            }

            // 5th attempt triggers lockout
            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(badReq)))
                    .andExpect(status().isUnauthorized());

            User updatedUser = userRepository.findById(testMember.getId()).orElseThrow();
            assertThat(updatedUser.getStatus()).isEqualTo("LOCKED");
            assertThat(updatedUser.getLockedUntil()).isNotNull();

            // 6th attempt with CORRECT password is still blocked
            LoginRequest correctReq = LoginRequest.builder()
                    .email("member@testclub.com")
                    .password("Champions@123")
                    .build();

            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(correctReq)))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.message").value("Account is temporarily locked due to multiple failed login attempts. Please try again later."));
        }

        @Test
        @DisplayName("Full token rotation: refresh token produces new token pair; reuse revokes family")
        void refreshTokenRotationAndReuseDetection() throws Exception {
            // 1. Initial login
            LoginRequest loginReq = LoginRequest.builder()
                    .email("member@testclub.com")
                    .password("Champions@123")
                    .build();

            MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(loginReq)))
                    .andExpect(status().isOk())
                    .andReturn();

            JsonNode loginJson = objectMapper.readTree(loginResult.getResponse().getContentAsString());
            String refreshToken1 = loginJson.get("refreshToken").asText();

            // 2. Refresh call rotates token
            RefreshTokenRequest refreshReq = RefreshTokenRequest.builder()
                    .refreshToken(refreshToken1)
                    .build();

            MvcResult refreshResult = mockMvc.perform(post("/api/v1/auth/refresh")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(refreshReq)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.accessToken").isNotEmpty())
                    .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                    .andReturn();

            JsonNode refreshJson = objectMapper.readTree(refreshResult.getResponse().getContentAsString());
            String refreshToken2 = refreshJson.get("refreshToken").asText();
            assertThat(refreshToken2).isNotEqualTo(refreshToken1);

            // 3. Attempting to reuse refreshToken1 MUST trigger reuse detection!
            mockMvc.perform(post("/api/v1/auth/refresh")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(refreshReq)))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("REFRESH_TOKEN_REUSE"));

            // 4. Invalidation check: refreshToken2 is now ALSO revoked because entire family was terminated
            RefreshTokenRequest refresh2Req = RefreshTokenRequest.builder()
                    .refreshToken(refreshToken2)
                    .build();

            mockMvc.perform(post("/api/v1/auth/refresh")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(refresh2Req)))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("GET /auth/me returns 200 for authenticated user and 401 when unauthenticated")
        void meEndpoint() throws Exception {
            mockMvc.perform(get("/api/v1/auth/me"))
                    .andExpect(status().isUnauthorized());

            mockMvc.perform(get("/api/v1/auth/me")
                            .header("Authorization", generateAuthHeader(testMember)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.email").value("member@testclub.com"))
                    .andExpect(jsonPath("$.role").value("MEMBER"));
        }
    }

    @Nested
    @DisplayName("RBAC Role Matrix Integration Tests")
    class RoleMatrixTests {

        @Test
        @DisplayName("OWNER and MANAGER can access GET /api/v1/users (200 OK)")
        void ownerAndManagerCanListUsers() throws Exception {
            mockMvc.perform(get("/api/v1/users")
                            .header("Authorization", generateAuthHeader(testOwner)))
                    .andExpect(status().isOk());

            mockMvc.perform(get("/api/v1/users")
                            .header("Authorization", generateAuthHeader(testManager)))
                    .andExpect(status().isOk());
        }

        @ParameterizedTest
        @EnumSource(value = Role.class, names = {"FRONT_DESK", "SHOP_STAFF", "BAR_STAFF", "KITCHEN", "COACH", "MEMBER", "GUEST"})
        @DisplayName("Non-admin roles get 403 Forbidden on GET /api/v1/users")
        void nonAdminRolesDeniedUsersList(Role nonAdminRole) throws Exception {
            User nonAdmin = userRepository.save(User.builder()
                    .email("staff_" + nonAdminRole.name().toLowerCase() + "@testclub.com")
                    .passwordHash(passwordEncoder.encode("Champions@123"))
                    .fullName("Staff Member " + nonAdminRole)
                    .role(nonAdminRole)
                    .status("ACTIVE")
                    .failedAttempts(0)
                    .tokenVersion(1)
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build());

            mockMvc.perform(get("/api/v1/users")
                            .header("Authorization", generateAuthHeader(nonAdmin)))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("Only OWNER can change user role on PATCH /api/v1/users/{id}/role (200 vs 403)")
        void onlyOwnerCanUpdateRole() throws Exception {
            UpdateRoleRequest roleReq = UpdateRoleRequest.builder()
                    .role(Role.FRONT_DESK)
                    .build();

            // Manager attempt -> 403 Forbidden
            mockMvc.perform(patch("/api/v1/users/" + testMember.getId() + "/role")
                            .header("Authorization", generateAuthHeader(testManager))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(roleReq)))
                    .andExpect(status().isForbidden());

            // Owner attempt -> 200 OK
            mockMvc.perform(patch("/api/v1/users/" + testMember.getId() + "/role")
                            .header("Authorization", generateAuthHeader(testOwner))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(roleReq)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.role").value("FRONT_DESK"));
        }

        @Test
        @DisplayName("Disabled user token is rejected with 401 on next call")
        void disabledUserTokenRejected() throws Exception {
            String token = generateAuthHeader(testMember);

            // Verify active token works
            mockMvc.perform(get("/api/v1/auth/me").header("Authorization", token))
                    .andExpect(status().isOk());

            // Admin disables the member
            mockMvc.perform(patch("/api/v1/users/" + testMember.getId() + "/status")
                            .header("Authorization", generateAuthHeader(testOwner))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(UpdateStatusRequest.builder().status("DISABLED").build())))
                    .andExpect(status().isOk());

            // Next call with the existing token MUST be rejected with 401
            mockMvc.perform(get("/api/v1/auth/me").header("Authorization", token))
                    .andExpect(status().isUnauthorized());
        }
    }
}
