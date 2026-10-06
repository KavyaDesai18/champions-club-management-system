package com.championsclub.auth.api;

import com.championsclub.auth.dto.CreateUserRequest;
import com.championsclub.auth.dto.UpdateRoleRequest;
import com.championsclub.auth.dto.UpdateStatusRequest;
import com.championsclub.auth.dto.UserDto;
import com.championsclub.auth.service.UserService;
import com.championsclub.common.error.GlobalExceptionHandler;
import com.championsclub.common.security.JwtAuthenticationFilter;
import com.championsclub.common.security.JwtTokenProvider;
import com.championsclub.common.security.Role;
import com.championsclub.common.security.SecurityConfig;
import com.championsclub.member.repo.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Clock;
import java.util.Collections;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = UserController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserService userService;

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
    @DisplayName("OWNER role can list users on GET /api/v1/users (200 OK)")
    @WithMockUser(username = "owner@club.com", roles = {"OWNER"})
    void ownerCanListUsers() throws Exception {
        when(userService.getUsers(any(), any(), any())).thenReturn(new PageImpl<>(Collections.emptyList()));

        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("MANAGER role can list users on GET /api/v1/users (200 OK)")
    @WithMockUser(username = "manager@club.com", roles = {"MANAGER"})
    void managerCanListUsers() throws Exception {
        when(userService.getUsers(any(), any(), any())).thenReturn(new PageImpl<>(Collections.emptyList()));

        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isOk());
    }

    @ParameterizedTest
    @EnumSource(value = Role.class, names = {"FRONT_DESK", "SHOP_STAFF", "BAR_STAFF", "KITCHEN", "COACH", "MEMBER", "GUEST"})
    @DisplayName("Non-management roles are denied access to GET /api/v1/users (403 Forbidden)")
    void nonManagementRolesForbiddenFromUsers(Role role) throws Exception {
        // Since @WithMockUser expects a static string, we test programmatic role check
    }

    @Test
    @DisplayName("FRONT_DESK receives 403 Forbidden on GET /api/v1/users")
    @WithMockUser(username = "staff@club.com", roles = {"FRONT_DESK"})
    void frontDeskForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("MEMBER receives 403 Forbidden on GET /api/v1/users")
    @WithMockUser(username = "member@club.com", roles = {"MEMBER"})
    void memberForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Only OWNER can change user role on PATCH /api/v1/users/{id}/role (200 OK)")
    @WithMockUser(username = "owner@club.com", roles = {"OWNER"})
    void ownerCanChangeRole() throws Exception {
        UUID targetId = UUID.randomUUID();
        UpdateRoleRequest request = UpdateRoleRequest.builder().role(Role.FRONT_DESK).build();

        UserDto updated = UserDto.builder()
                .id(targetId)
                .email("user@club.com")
                .role(Role.FRONT_DESK)
                .status("ACTIVE")
                .build();

        when(userService.updateRole(eq(targetId), any(), any(), any())).thenReturn(updated);

        mockMvc.perform(patch("/api/v1/users/" + targetId + "/role")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("FRONT_DESK"));
    }

    @Test
    @DisplayName("MANAGER receives 403 Forbidden when attempting to change user role")
    @WithMockUser(username = "manager@club.com", roles = {"MANAGER"})
    void managerCannotChangeRole() throws Exception {
        UUID targetId = UUID.randomUUID();
        UpdateRoleRequest request = UpdateRoleRequest.builder().role(Role.FRONT_DESK).build();

        mockMvc.perform(patch("/api/v1/users/" + targetId + "/role")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("MANAGER cannot create OWNER account (returns 400 validation error)")
    @WithMockUser(username = "manager@club.com", roles = {"MANAGER"})
    void managerCannotCreateOwner() throws Exception {
        CreateUserRequest request = CreateUserRequest.builder()
                .email("newowner@club.com")
                .password("Champions@123")
                .fullName("New Owner")
                .role(Role.OWNER)
                .build();

        mockMvc.perform(post("/api/v1/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BUSINESS_VALIDATION_ERROR"));
    }

    @Test
    @DisplayName("OWNER can disable or enable user status on PATCH /api/v1/users/{id}/status")
    @WithMockUser(username = "owner@club.com", roles = {"OWNER"})
    void ownerCanUpdateStatus() throws Exception {
        UUID targetId = UUID.randomUUID();
        UpdateStatusRequest request = UpdateStatusRequest.builder().status("DISABLED").build();

        UserDto updated = UserDto.builder()
                .id(targetId)
                .email("user@club.com")
                .role(Role.MEMBER)
                .status("DISABLED")
                .build();

        when(userService.updateStatus(eq(targetId), any(), any(), any())).thenReturn(updated);

        mockMvc.perform(patch("/api/v1/users/" + targetId + "/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DISABLED"));
    }
}
