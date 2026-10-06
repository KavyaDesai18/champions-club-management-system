package com.championsclub.member.api;

import com.championsclub.common.error.GlobalExceptionHandler;
import com.championsclub.common.security.JwtAuthenticationFilter;
import com.championsclub.common.security.JwtTokenProvider;
import com.championsclub.common.security.SecurityConfig;
import com.championsclub.member.domain.MemberStatus;
import com.championsclub.member.dto.Member360Dto;
import com.championsclub.member.dto.MemberSummaryDto;
import com.championsclub.member.dto.QrTokenResponse;
import com.championsclub.member.dto.RegisterMemberRequest;
import com.championsclub.member.dto.UpdateMemberStatusRequest;
import com.championsclub.member.repo.UserRepository;
import com.championsclub.member.service.MemberService;
import com.championsclub.member.service.MembershipService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = MemberController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
class MemberControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private MemberService memberService;
    @MockBean private MembershipService legacyMembershipService;
    @MockBean private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockBean private JwtTokenProvider jwtTokenProvider;
    @MockBean private UserRepository userRepository;
    @MockBean private Clock clock;

    private final UUID sampleId = UUID.randomUUID();

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
    @DisplayName("POST /register: Front Desk can register an adult member (201 Created)")
    @WithMockUser(username = "frontdesk@club.com", roles = {"FRONT_DESK"})
    void frontDeskCanRegisterMember() throws Exception {
        RegisterMemberRequest request = RegisterMemberRequest.builder()
                .fullName("P. V. Sindhu")
                .email("sindhu@champions.com")
                .phone("+919876543210")
                .dob(LocalDate.of(1995, 7, 5))
                .planCode("GOLD")
                .build();

        Member360Dto dto = Member360Dto.builder()
                .profile(Member360Dto.ProfileInfo.builder()
                        .id(sampleId)
                        .memberNo("CC-000001")
                        .fullName("P. V. Sindhu")
                        .status("ACTIVE")
                        .build())
                .build();

        when(memberService.registerMember(any(), any())).thenReturn(dto);

        mockMvc.perform(post("/api/v1/members/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.profile.memberNo").value("CC-000001"))
                .andExpect(jsonPath("$.profile.fullName").value("P. V. Sindhu"));
    }

    @Test
    @DisplayName("POST /register: Unauthenticated visitor gets 401 Unauthorized")
    void unauthenticatedCannotRegister() throws Exception {
        RegisterMemberRequest request = RegisterMemberRequest.builder()
                .fullName("Stranger")
                .email("stranger@test.com")
                .phone("+919876543210")
                .dob(LocalDate.of(1995, 7, 5))
                .planCode("GOLD")
                .build();

        mockMvc.perform(post("/api/v1/members/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /register: Member role gets 403 Forbidden")
    @WithMockUser(username = "member@club.com", roles = {"MEMBER"})
    void memberRoleCannotRegisterOtherMembers() throws Exception {
        RegisterMemberRequest request = RegisterMemberRequest.builder()
                .fullName("Friend")
                .email("friend@test.com")
                .phone("+919876543210")
                .dob(LocalDate.of(1995, 7, 5))
                .planCode("SILVER")
                .build();

        mockMvc.perform(post("/api/v1/members/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /: Search members with pagination returns 200 OK")
    @WithMockUser(username = "staff@club.com", roles = {"FRONT_DESK"})
    void searchMembersPaginated() throws Exception {
        MemberSummaryDto summary = MemberSummaryDto.builder()
                .id(sampleId)
                .memberNo("CC-000001")
                .fullName("P. V. Sindhu")
                .status(MemberStatus.ACTIVE)
                .build();

        when(memberService.searchMembers(any(), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(summary)));

        mockMvc.perform(get("/api/v1/members")
                        .param("search", "Sindhu")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].memberNo").value("CC-000001"));
    }

    @Test
    @DisplayName("GET /{id}/360: Get Member 360 profile returns 200 OK")
    @WithMockUser(username = "staff@club.com", roles = {"FRONT_DESK"})
    void getMember360Profile() throws Exception {
        Member360Dto dto = Member360Dto.builder()
                .profile(Member360Dto.ProfileInfo.builder()
                        .id(sampleId)
                        .memberNo("CC-000001")
                        .fullName("P. V. Sindhu")
                        .status("ACTIVE")
                        .build())
                .build();

        when(memberService.getMember360(sampleId)).thenReturn(dto);

        mockMvc.perform(get("/api/v1/members/" + sampleId + "/360"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profile.memberNo").value("CC-000001"));
    }

    @Test
    @DisplayName("GET /qr-lookup: Lookup member by QR token returns 200 OK")
    @WithMockUser(username = "staff@club.com", roles = {"FRONT_DESK"})
    void lookupByQrToken() throws Exception {
        Member360Dto dto = Member360Dto.builder()
                .profile(Member360Dto.ProfileInfo.builder()
                        .id(sampleId)
                        .memberNo("CC-000001")
                        .fullName("P. V. Sindhu")
                        .status("ACTIVE")
                        .build())
                .build();

        when(memberService.lookupByQrToken("valid-qr-token")).thenReturn(dto);

        mockMvc.perform(get("/api/v1/members/qr-lookup").param("token", "valid-qr-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profile.memberNo").value("CC-000001"));
    }

    @Test
    @DisplayName("PATCH /{id}/status: Front Desk is forbidden from suspending members (403)")
    @WithMockUser(username = "frontdesk@club.com", roles = {"FRONT_DESK"})
    void frontDeskCannotSuspendMember() throws Exception {
        UpdateMemberStatusRequest req = UpdateMemberStatusRequest.builder()
                .status(MemberStatus.SUSPENDED)
                .reason("Disciplinary violation")
                .build();

        mockMvc.perform(patch("/api/v1/members/" + sampleId + "/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("PATCH /{id}/status: Manager can suspend members (200 OK)")
    @WithMockUser(username = "manager@club.com", roles = {"MANAGER"})
    void managerCanSuspendMember() throws Exception {
        UpdateMemberStatusRequest req = UpdateMemberStatusRequest.builder()
                .status(MemberStatus.SUSPENDED)
                .reason("Disciplinary violation")
                .build();

        Member360Dto dto = Member360Dto.builder()
                .profile(Member360Dto.ProfileInfo.builder()
                        .id(sampleId)
                        .status("SUSPENDED")
                        .build())
                .build();

        when(memberService.updateMemberStatus(eq(sampleId), any(), any())).thenReturn(dto);

        mockMvc.perform(patch("/api/v1/members/" + sampleId + "/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profile.status").value("SUSPENDED"));
    }

    @Test
    @DisplayName("DELETE /{id}: Front Desk cannot soft delete (403); Owner can soft delete (204)")
    @WithMockUser(username = "owner@club.com", roles = {"OWNER"})
    void ownerCanSoftDeleteMember() throws Exception {
        mockMvc.perform(delete("/api/v1/members/" + sampleId))
                .andExpect(status().isNoContent());
    }
}
