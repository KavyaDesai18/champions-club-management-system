package com.championsclub.auth.api;

import com.championsclub.auth.dto.CreateUserRequest;
import com.championsclub.auth.dto.UpdateRoleRequest;
import com.championsclub.auth.dto.UpdateStatusRequest;
import com.championsclub.auth.dto.UpdateUserRequest;
import com.championsclub.auth.dto.UserDto;
import com.championsclub.auth.service.UserService;
import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.security.Role;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@Tag(name = "User Administration", description = "Endpoints for managing club personnel, member accounts, status, and role assignments")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "List and filter club users")
    public ResponseEntity<Page<UserDto>> listUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Role role,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        Page<UserDto> users = userService.getUsers(search, role, pageable);
        return ResponseEntity.ok(users);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Get user details by ID")
    public ResponseEntity<UserDto> getUser(@PathVariable UUID id) {
        UserDto user = userService.getUserById(id);
        return ResponseEntity.ok(user);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Create new club staff or member account")
    public ResponseEntity<UserDto> createUser(
            @Valid @RequestBody CreateUserRequest request,
            Authentication authentication,
            HttpServletRequest servletRequest
    ) {
        boolean isOwner = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_OWNER"));

        // Managers cannot create Owners or other Managers
        if (!isOwner && (request.getRole() == Role.OWNER || request.getRole() == Role.MANAGER)) {
            throw new BusinessValidationException("Managers cannot create Owner or Manager accounts.");
        }

        String ipAddress = extractClientIp(servletRequest);
        UserDto created = userService.createUser(request, authentication.getName(), ipAddress);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Update user details")
    public ResponseEntity<UserDto> updateUser(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserRequest request,
            Principal principal,
            HttpServletRequest servletRequest
    ) {
        String ipAddress = extractClientIp(servletRequest);
        UserDto updated = userService.updateUser(id, request, principal.getName(), ipAddress);
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Activate or disable user account")
    public ResponseEntity<UserDto> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateStatusRequest request,
            Principal principal,
            HttpServletRequest servletRequest
    ) {
        String ipAddress = extractClientIp(servletRequest);
        UserDto updated = userService.updateStatus(id, request, principal.getName(), ipAddress);
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/{id}/role")
    @PreAuthorize("hasRole('OWNER')")
    @Operation(summary = "Change user RBAC role (Owner only)")
    public ResponseEntity<UserDto> updateRole(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateRoleRequest request,
            Principal principal,
            HttpServletRequest servletRequest
    ) {
        String ipAddress = extractClientIp(servletRequest);
        UserDto updated = userService.updateRole(id, request, principal.getName(), ipAddress);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/{id}/logout")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    @Operation(summary = "Force logout user across all devices")
    public ResponseEntity<Map<String, String>> forceLogout(
            @PathVariable UUID id,
            Principal principal,
            HttpServletRequest servletRequest
    ) {
        String ipAddress = extractClientIp(servletRequest);
        userService.forceLogout(id, principal.getName(), ipAddress);
        return ResponseEntity.ok(Map.of("message", "User has been logged out of all active devices."));
    }

    private String extractClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
