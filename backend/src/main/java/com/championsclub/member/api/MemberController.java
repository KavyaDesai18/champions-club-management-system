package com.championsclub.member.api;

import com.championsclub.member.dto.CreateMemberRequest;
import com.championsclub.member.dto.MemberProfileDto;
import com.championsclub.member.dto.WalletTopUpRequest;
import com.championsclub.member.service.MembershipService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/members")
@Tag(name = "Member Management", description = "Endpoints for member registration, profile, and wallet operations")
public class MemberController {

    private final MembershipService membershipService;

    public MemberController(MembershipService membershipService) {
        this.membershipService = membershipService;
    }

    @PostMapping("/register")
    @Operation(summary = "Register member", description = "Registers a new member with membership tier allocation")
    public ResponseEntity<MemberProfileDto> registerMember(
            @Valid @RequestBody CreateMemberRequest request,
            HttpServletRequest servletRequest
    ) {
        String clientIp = servletRequest.getRemoteAddr();
        MemberProfileDto response = membershipService.registerMember(request, clientIp);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{userId}")
    @Operation(summary = "Get member profile", description = "Fetches member details, tier, wallet, and remaining guest passes")
    public ResponseEntity<MemberProfileDto> getProfile(@PathVariable UUID userId) {
        return ResponseEntity.ok(membershipService.getProfile(userId));
    }

    @PostMapping("/{userId}/wallet/top-up")
    @Operation(summary = "Top up member wallet", description = "Increases wallet balance with audit log tracking")
    public ResponseEntity<MemberProfileDto> topUpWallet(
            @PathVariable UUID userId,
            @Valid @RequestBody WalletTopUpRequest request,
            HttpServletRequest servletRequest
    ) {
        String clientIp = servletRequest.getRemoteAddr();
        return ResponseEntity.ok(membershipService.topUpWallet(userId, request, clientIp));
    }
}
