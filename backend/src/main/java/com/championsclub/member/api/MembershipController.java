package com.championsclub.member.api;

import com.championsclub.member.domain.Member;
import com.championsclub.member.domain.Membership;
import com.championsclub.member.domain.ReminderType;
import com.championsclub.member.dto.ExpiringMembershipDto;
import com.championsclub.member.dto.MembershipDto;
import com.championsclub.member.dto.MembershipEventDto;
import com.championsclub.member.dto.RenewMembershipRequest;
import com.championsclub.member.refund.RefundResult;
import com.championsclub.member.repo.MemberRepository;
import com.championsclub.member.repo.MembershipRepository;
import com.championsclub.member.service.MembershipLifecycleService;
import com.championsclub.notification.domain.NotificationType;
import com.championsclub.notification.service.NotificationDispatcher;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/memberships")
@Tag(name = "Membership Lifecycle & Renewals", description = "Endpoints for membership renewals, expiring roster, history, and cancellations")
public class MembershipController {

    private final MembershipLifecycleService lifecycleService;
    private final MemberRepository memberRepository;
    private final MembershipRepository membershipRepository;
    private final NotificationDispatcher notificationDispatcher;

    public MembershipController(
            MembershipLifecycleService lifecycleService,
            MemberRepository memberRepository,
            MembershipRepository membershipRepository,
            NotificationDispatcher notificationDispatcher
    ) {
        this.lifecycleService = lifecycleService;
        this.memberRepository = memberRepository;
        this.membershipRepository = membershipRepository;
        this.notificationDispatcher = notificationDispatcher;
    }

    @PostMapping("/{memberId}/renew")
    @Operation(summary = "Renew membership", description = "Renews membership. Extends from current end date if active, or starts today if expired.")
    public ResponseEntity<MembershipDto> renewMembership(
            @PathVariable UUID memberId,
            @Valid @RequestBody(required = false) RenewMembershipRequest request,
            Authentication auth
    ) {
        String actor = auth != null ? auth.getName() : "SELF_SERVICE";
        RenewMembershipRequest req = request != null ? request : new RenewMembershipRequest();
        MembershipDto renewed = lifecycleService.renewMembership(memberId, req, actor);
        return ResponseEntity.ok(renewed);
    }

    @GetMapping("/{memberId}/current")
    @Operation(summary = "Get active membership", description = "Returns active membership for given member")
    public ResponseEntity<MembershipDto> getCurrentMembership(@PathVariable UUID memberId) {
        MembershipDto dto = lifecycleService.getActiveMembership(memberId);
        return dto != null ? ResponseEntity.ok(dto) : ResponseEntity.notFound().build();
    }

    @GetMapping("/{memberId}/history")
    @Operation(summary = "Membership history", description = "All historical membership rows for member")
    public ResponseEntity<List<MembershipDto>> getHistory(@PathVariable UUID memberId) {
        return ResponseEntity.ok(lifecycleService.getMembershipHistory(memberId));
    }

    @GetMapping("/{memberId}/events")
    @Operation(summary = "Membership event audit log", description = "Immutable audit events for member lifecycle transitions")
    public ResponseEntity<List<MembershipEventDto>> getEvents(@PathVariable UUID memberId) {
        return ResponseEntity.ok(lifecycleService.getMembershipEvents(memberId));
    }

    @GetMapping("/expiring")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'FRONT_DESK')")
    @Operation(summary = "Expiring memberships roster", description = "Filterable list of memberships expiring soon or expired for staff console")
    public ResponseEntity<Page<ExpiringMembershipDto>> getExpiringMemberships(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String planCode,
            @RequestParam(required = false) Integer daysWindow,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        Page<ExpiringMembershipDto> result = lifecycleService.searchExpiringMemberships(search, status, planCode, daysWindow, pageable);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{memberId}/remind")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'FRONT_DESK')")
    @Operation(summary = "Send manual expiry reminder", description = "Staff trigger to dispatch an instant reminder to a member")
    public ResponseEntity<Map<String, Object>> sendReminder(
            @PathVariable UUID memberId,
            Authentication auth
    ) {
        Member member = memberRepository.findByIdAndIsDeletedFalse(memberId)
                .orElseThrow(() -> new IllegalArgumentException("Member not found"));

        Membership active = membershipRepository.findActiveByMemberId(memberId).orElse(null);
        String planName = active != null && active.getPlan() != null ? active.getPlan().getName() : "Club";
        String endDate = member.getEndDate() != null ? member.getEndDate().toString() : "N/A";

        notificationDispatcher.dispatch(
                member.getUser(),
                member,
                "Action Required: Membership Renewal Reminder",
                String.format("Hello %s, your Champions Club %s membership is expiring on %s. Please renew now to maintain booking privileges.",
                        member.getFullName(), planName, endDate),
                NotificationType.MEMBERSHIP_EXPIRY,
                "{\"manualTrigger\":true,\"triggeredBy\":\"" + (auth != null ? auth.getName() : "STAFF") + "\"}"
        );

        return ResponseEntity.ok(Map.of("success", true, "message", "Reminder dispatched to " + member.getFullName()));
    }

    @PostMapping("/{memberId}/cancel")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Cancel membership with refund hook", description = "Cancels active membership and invokes P10 refund calculation hook")
    public ResponseEntity<RefundResult> cancelMembership(
            @PathVariable UUID memberId,
            @RequestBody(required = false) Map<String, String> body,
            Authentication auth
    ) {
        String reason = body != null && body.containsKey("reason") ? body.get("reason") : "Administrative cancellation";
        String actor = auth != null ? auth.getName() : "STAFF";
        RefundResult result = lifecycleService.cancelMembership(memberId, reason, actor);
        return ResponseEntity.ok(result);
    }
}
