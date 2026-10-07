package com.championsclub.member.api;

import com.championsclub.member.domain.MemberCheckIn;
import com.championsclub.member.dto.CheckInRequest;
import com.championsclub.member.dto.CheckInResponse;
import com.championsclub.member.service.CheckInService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/check-in")
@Tag(name = "Front Desk Check-in Operations", description = "QR badge check-in, status banner evaluation, and 5-min duplicate check")
public class CheckInController {

    private final CheckInService checkInService;

    public CheckInController(CheckInService checkInService) {
        this.checkInService = checkInService;
    }

    @PostMapping("/scan")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'FRONT_DESK')")
    @Operation(summary = "Front desk check-in scan", description = "Scans QR token or member code, returns status banner, and prevents duplicate check-in within 5 minutes")
    public ResponseEntity<CheckInResponse> processCheckIn(
            @Valid @RequestBody CheckInRequest request,
            Authentication auth
    ) {
        String actor = auth != null ? auth.getName() : "FRONT_DESK";
        CheckInResponse response = checkInService.processCheckIn(request, actor);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/history")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'FRONT_DESK')")
    @Operation(summary = "Recent check-in visits")
    public ResponseEntity<Page<MemberCheckIn>> getCheckInHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(checkInService.getRecentCheckIns(PageRequest.of(page, size)));
    }
}
