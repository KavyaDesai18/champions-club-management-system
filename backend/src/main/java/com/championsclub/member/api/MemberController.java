package com.championsclub.member.api;

import com.championsclub.member.domain.MemberStatus;
import com.championsclub.member.dto.ChangePlanRequest;
import com.championsclub.member.dto.CreateMemberRequest;
import com.championsclub.member.dto.Member360Dto;
import com.championsclub.member.dto.MemberProfileDto;
import com.championsclub.member.dto.MemberSummaryDto;
import com.championsclub.member.dto.QrTokenResponse;
import com.championsclub.member.dto.RegisterMemberRequest;
import com.championsclub.member.dto.UpdateMemberRequest;
import com.championsclub.member.dto.UpdateMemberStatusRequest;
import com.championsclub.member.dto.WalletTopUpRequest;
import com.championsclub.member.service.MemberService;
import com.championsclub.member.service.MembershipService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/members")
@Tag(name = "Member Operations & Member 360", description = "Endpoints for member registration, 360 profiles, QR check-in, photo upload, and lifecycle management")
public class MemberController {

    private final MemberService memberService;
    private final MembershipService legacyMembershipService;

    public MemberController(MemberService memberService, MembershipService legacyMembershipService) {
        this.memberService = memberService;
        this.legacyMembershipService = legacyMembershipService;
    }

    @PostMapping("/register")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'FRONT_DESK')")
    @Operation(summary = "Register new member", description = "Front desk wizard endpoint supporting adult and junior registration with age rules")
    public ResponseEntity<Member360Dto> registerMember(
            @Valid @RequestBody RegisterMemberRequest request,
            Authentication auth
    ) {
        String actor = auth != null ? auth.getName() : "FRONT_DESK";
        Member360Dto response = memberService.registerMember(request, actor);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'FRONT_DESK', 'COACH')")
    @Operation(summary = "Search and list members", description = "Fuzzy search by name, phone, email, or member number with status and plan filters")
    public ResponseEntity<Page<MemberSummaryDto>> searchMembers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) MemberStatus status,
            @RequestParam(required = false) String plan,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(memberService.searchMembers(search, status, plan, pageable));
    }

    @GetMapping("/{memberId}/360")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'FRONT_DESK', 'COACH', 'MEMBER')")
    @Operation(summary = "Get Member 360 profile", description = "Fetches comprehensive member overview: contact, plan, entitlements, guardian, and recent activity")
    public ResponseEntity<Member360Dto> getMember360(@PathVariable UUID memberId) {
        return ResponseEntity.ok(memberService.getMember360(memberId));
    }

    @GetMapping("/no/{memberNo}/360")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'FRONT_DESK', 'COACH', 'MEMBER')")
    @Operation(summary = "Get Member 360 by member number", description = "Fetches member 360 profile by readable member number (e.g. CC-000123)")
    public ResponseEntity<Member360Dto> getMember360ByNo(@PathVariable String memberNo) {
        return ResponseEntity.ok(memberService.getMember360ByNo(memberNo));
    }

    @PutMapping("/{memberId}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'FRONT_DESK')")
    @Operation(summary = "Update member profile", description = "Updates personal contact details and notes with duplicate validation")
    public ResponseEntity<Member360Dto> updateMember(
            @PathVariable UUID memberId,
            @Valid @RequestBody UpdateMemberRequest request,
            Authentication auth
    ) {
        String actor = auth != null ? auth.getName() : "STAFF";
        return ResponseEntity.ok(memberService.updateMember(memberId, request, actor));
    }

    @PatchMapping("/{memberId}/status")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Suspend or reactivate member", description = "Changes member status to ACTIVE, SUSPENDED, or CANCELLED with audit log")
    public ResponseEntity<Member360Dto> updateStatus(
            @PathVariable UUID memberId,
            @Valid @RequestBody UpdateMemberStatusRequest request,
            Authentication auth
    ) {
        String actor = auth != null ? auth.getName() : "MANAGER";
        return ResponseEntity.ok(memberService.updateMemberStatus(memberId, request, actor));
    }

    @PostMapping("/{memberId}/change-plan")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'FRONT_DESK')")
    @Operation(summary = "Change membership plan", description = "Immediately switches plan tier with age eligibility verification")
    public ResponseEntity<Member360Dto> changePlan(
            @PathVariable UUID memberId,
            @Valid @RequestBody ChangePlanRequest request,
            Authentication auth
    ) {
        String actor = auth != null ? auth.getName() : "FRONT_DESK";
        return ResponseEntity.ok(memberService.changePlan(memberId, request, actor));
    }

    @DeleteMapping("/{memberId}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Soft delete member", description = "Marks member as deleted while preserving historical reservation integrity")
    public ResponseEntity<Void> deleteMember(
            @PathVariable UUID memberId,
            Authentication auth
    ) {
        String actor = auth != null ? auth.getName() : "ADMIN";
        memberService.softDeleteMember(memberId, actor);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{memberId}/qr-token")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'FRONT_DESK', 'MEMBER')")
    @Operation(summary = "Get signed QR badge token", description = "Generates a signed HMAC short token and base64 QR code image")
    public ResponseEntity<QrTokenResponse> getQrToken(@PathVariable UUID memberId) {
        return ResponseEntity.ok(memberService.generateQrToken(memberId));
    }

    @GetMapping("/qr-lookup")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'FRONT_DESK')")
    @Operation(summary = "Lookup member by scanned QR token", description = "Validates QR token signature and expiration, returning member 360 profile")
    public ResponseEntity<Member360Dto> lookupByQr(@RequestParam String token) {
        return ResponseEntity.ok(memberService.lookupByQrToken(token));
    }

    @PostMapping(value = "/{memberId}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'FRONT_DESK')")
    @Operation(summary = "Upload member photo", description = "Validates file type (JPEG, PNG, WebP) and size (<5MB), disallowing SVG scripts")
    public ResponseEntity<Map<String, String>> uploadPhoto(
            @PathVariable UUID memberId,
            @RequestParam("file") MultipartFile file
    ) {
        String dataUrl = memberService.uploadMemberPhoto(memberId, file);
        return ResponseEntity.ok(Map.of("photoUrl", dataUrl));
    }

    // --- Legacy Endpoints for compatibility ---
    @PostMapping("/legacy/register")
    @Operation(summary = "Legacy register member", description = "Backward compatible registration endpoint")
    public ResponseEntity<MemberProfileDto> legacyRegister(
            @Valid @RequestBody CreateMemberRequest request,
            HttpServletRequest servletRequest
    ) {
        String clientIp = servletRequest.getRemoteAddr();
        return ResponseEntity.status(HttpStatus.CREATED).body(legacyMembershipService.registerMember(request, clientIp));
    }

    @GetMapping("/legacy/{userId}")
    @Operation(summary = "Legacy get profile", description = "Backward compatible profile endpoint")
    public ResponseEntity<MemberProfileDto> legacyGetProfile(@PathVariable UUID userId) {
        return ResponseEntity.ok(legacyMembershipService.getProfile(userId));
    }

    @PostMapping("/legacy/{userId}/wallet/top-up")
    @Operation(summary = "Legacy top up wallet", description = "Backward compatible wallet top up")
    public ResponseEntity<MemberProfileDto> legacyTopUpWallet(
            @PathVariable UUID userId,
            @Valid @RequestBody WalletTopUpRequest request,
            HttpServletRequest servletRequest
    ) {
        String clientIp = servletRequest.getRemoteAddr();
        return ResponseEntity.ok(legacyMembershipService.topUpWallet(userId, request, clientIp));
    }
}
