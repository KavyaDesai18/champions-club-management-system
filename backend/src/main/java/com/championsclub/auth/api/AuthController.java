package com.championsclub.auth.api;

import com.championsclub.auth.dto.AuthResponse;
import com.championsclub.auth.dto.ChangePasswordRequest;
import com.championsclub.auth.dto.ForgotPasswordRequest;
import com.championsclub.auth.dto.LoginRequest;
import com.championsclub.auth.dto.RefreshTokenRequest;
import com.championsclub.auth.dto.ResetPasswordRequest;
import com.championsclub.auth.dto.TokenRefreshResponse;
import com.championsclub.auth.dto.UserDto;
import com.championsclub.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication & Sessions", description = "Endpoints for login, rotating token refresh, logout, password recovery, and authenticated profile")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    @Operation(summary = "Authenticate user with email and password")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest servletRequest
    ) {
        String ipAddress = extractClientIp(servletRequest);
        String userAgent = servletRequest.getHeader("User-Agent");
        AuthResponse response = authService.login(request, ipAddress, userAgent);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh")
    @Operation(summary = "Rotate refresh token and retrieve new access token")
    public ResponseEntity<TokenRefreshResponse> refresh(
            @Valid @RequestBody RefreshTokenRequest request,
            HttpServletRequest servletRequest
    ) {
        String ipAddress = extractClientIp(servletRequest);
        String userAgent = servletRequest.getHeader("User-Agent");
        TokenRefreshResponse response = authService.refresh(request.getRefreshToken(), ipAddress, userAgent);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    @Operation(summary = "Revoke current refresh token session")
    public ResponseEntity<Map<String, String>> logout(
            @RequestBody(required = false) RefreshTokenRequest request,
            HttpServletRequest servletRequest
    ) {
        String ipAddress = extractClientIp(servletRequest);
        String token = request != null ? request.getRefreshToken() : null;
        authService.logout(token, ipAddress);
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @PostMapping("/logout-all")
    @Operation(summary = "Revoke all active sessions across all devices")
    public ResponseEntity<Map<String, String>> logoutAll(
            Principal principal,
            HttpServletRequest servletRequest
    ) {
        String ipAddress = extractClientIp(servletRequest);
        authService.logoutAll(principal.getName(), ipAddress);
        return ResponseEntity.ok(Map.of("message", "All active sessions have been revoked"));
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Request password reset link via email")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request,
            HttpServletRequest servletRequest
    ) {
        String ipAddress = extractClientIp(servletRequest);
        authService.forgotPassword(request.getEmail(), ipAddress);
        return ResponseEntity.ok(Map.of(
                "message", "If an account with that email exists, password reset instructions have been dispatched."
        ));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset password using single-use verification token")
    public ResponseEntity<Map<String, String>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request,
            HttpServletRequest servletRequest
    ) {
        String ipAddress = extractClientIp(servletRequest);
        authService.resetPassword(request, ipAddress);
        return ResponseEntity.ok(Map.of("message", "Password has been reset successfully. Please log in with your new credentials."));
    }

    @GetMapping("/me")
    @Operation(summary = "Get current authenticated user profile")
    public ResponseEntity<UserDto> getMe(Principal principal) {
        UserDto profile = authService.getMe(principal.getName());
        return ResponseEntity.ok(profile);
    }

    @PatchMapping("/me/password")
    @Operation(summary = "Change password for currently authenticated user")
    public ResponseEntity<Map<String, String>> changePassword(
            Principal principal,
            @Valid @RequestBody ChangePasswordRequest request,
            HttpServletRequest servletRequest
    ) {
        String ipAddress = extractClientIp(servletRequest);
        authService.changePassword(principal.getName(), request, ipAddress);
        return ResponseEntity.ok(Map.of("message", "Password updated successfully. All other sessions have been terminated."));
    }

    private String extractClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
