package com.championsclub.auth.service;

import com.championsclub.auth.domain.PasswordResetToken;
import com.championsclub.auth.domain.RefreshToken;
import com.championsclub.auth.dto.AuthResponse;
import com.championsclub.auth.dto.ChangePasswordRequest;
import com.championsclub.auth.dto.LoginRequest;
import com.championsclub.auth.dto.RegisterRequest;
import com.championsclub.auth.dto.ResetPasswordRequest;
import com.championsclub.auth.dto.TokenRefreshResponse;
import com.championsclub.auth.dto.UserDto;
import com.championsclub.common.security.Role;
import com.championsclub.auth.repo.PasswordResetTokenRepository;
import com.championsclub.auth.repo.RefreshTokenRepository;
import com.championsclub.common.audit.AuditService;
import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.ChampionsClubException;
import com.championsclub.common.security.JwtTokenProvider;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final JwtTokenProvider tokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicyValidator passwordPolicyValidator;
    private final AuditService auditService;
    private final Clock clock;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.championsclub.member.repo.MemberRepository memberRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.championsclub.member.repo.PlanRepository planRepository;

    public AuthService(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            JwtTokenProvider tokenProvider,
            PasswordEncoder passwordEncoder,
            PasswordPolicyValidator passwordPolicyValidator,
            AuditService auditService,
            Clock clock
    ) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.tokenProvider = tokenProvider;
        this.passwordEncoder = passwordEncoder;
        this.passwordPolicyValidator = passwordPolicyValidator;
        this.auditService = auditService;
        this.clock = clock;
    }

    @Transactional
    public AuthResponse login(LoginRequest request, String ipAddress, String userAgent) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        Optional<User> userOpt = userRepository.findByEmailAndIsDeletedFalse(normalizedEmail);

        if (userOpt.isEmpty()) {
            // Timing mitigation
            passwordEncoder.matches("dummyPassword123", "$2a$12$e8j7X73p338fC099uT77y.i4m6e5p7r9v1t3x5z7y9w1v3u5s7q9");
            auditService.record(null, "LOGIN_FAILED", "USER", normalizedEmail, "User not found", ipAddress);
            throw new BadCredentialsException("Invalid email or password.");
        }

        User user = userOpt.get();
        Instant now = clock.instant();

        // Check if account is locked
        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(now)) {
            auditService.record(user.getId(), "LOGIN_BLOCKED_LOCKED", "USER", user.getId().toString(), "Account is temporarily locked", ipAddress);
            throw new BadCredentialsException("Account is temporarily locked due to multiple failed login attempts. Please try again later.");
        }

        // Check if account is disabled
        if ("DISABLED".equalsIgnoreCase(user.getStatus())) {
            auditService.record(user.getId(), "LOGIN_BLOCKED_DISABLED", "USER", user.getId().toString(), "Account is disabled", ipAddress);
            throw new BadCredentialsException("Account is disabled. Please contact club administration.");
        }

        // Verify password
        boolean matches = passwordEncoder.matches(request.getPassword(), user.getPasswordHash());

        if (!matches) {
            int failedAttempts = user.getFailedAttempts() + 1;
            user.setFailedAttempts(failedAttempts);

            if (failedAttempts >= 5) {
                user.setLockedUntil(now.plus(Duration.ofMinutes(15)));
                user.setStatus("LOCKED");
                auditService.record(user.getId(), "ACCOUNT_LOCKED", "USER", user.getId().toString(), "Account locked after 5 failed attempts", ipAddress);
            }

            user.setUpdatedAt(now);
            userRepository.save(user);
            auditService.record(user.getId(), "LOGIN_FAILED", "USER", user.getId().toString(), "Failed attempt #" + failedAttempts, ipAddress);
            throw new BadCredentialsException("Invalid email or password.");
        }

        // Password is correct! Reset lockout state
        user.setFailedAttempts(0);
        user.setLockedUntil(null);
        if ("LOCKED".equalsIgnoreCase(user.getStatus())) {
            user.setStatus("ACTIVE");
        }
        user.setUpdatedAt(now);
        userRepository.save(user);

        // Check if user has registered with the selected role
        if (request.getRole() != null && user.getRole() != request.getRole()) {
            auditService.record(user.getId(), "LOGIN_ROLE_MISMATCH", "USER", user.getId().toString(),
                    "Role mismatch: attempted " + request.getRole() + " but registered as " + user.getRole(), ipAddress);
            throw new ChampionsClubException(HttpStatus.FORBIDDEN, "ROLE_MISMATCH",
                    "This is not your role! You are registered as " + user.getRole() + ". Please select " + user.getRole() + " to access the website as this particular role.");
        }

        // Generate Access Token (15m) and Refresh Token (7d)
        String accessToken = tokenProvider.generateAccessToken(
                user.getId(),
                user.getEmail(),
                user.getRole(),
                user.getTokenVersion()
        );

        String rawRefreshToken = tokenProvider.generateSecureRandomToken();
        String tokenHash = tokenProvider.hashToken(rawRefreshToken);

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .tokenHash(tokenHash)
                .familyId(UUID.randomUUID())
                .expiresAt(now.plus(Duration.ofDays(7)))
                .ip(ipAddress)
                .userAgent(userAgent)
                .createdAt(now)
                .build();
        refreshTokenRepository.save(refreshToken);

        auditService.record(user.getId(), "LOGIN_SUCCESS", "USER", user.getId().toString(), "User authenticated successfully", ipAddress);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(rawRefreshToken)
                .tokenType("Bearer")
                .expiresInSeconds(tokenProvider.getAccessTokenExpirationSeconds())
                .user(UserDto.fromEntity(user))
                .build();
    }

    @Transactional
    public AuthResponse register(RegisterRequest request, String ipAddress, String userAgent) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();

        if (userRepository.findByEmailAndIsDeletedFalse(normalizedEmail).isPresent()) {
            throw new ChampionsClubException(HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS", "An account with this email address already exists. Please sign in instead.");
        }

        passwordPolicyValidator.validate(request.getPassword());

        Instant now = clock.instant();

        User newUser = User.builder()
                .email(normalizedEmail)
                .fullName(request.getFullName().trim())
                .phone(StringUtils.hasText(request.getPhone()) ? request.getPhone().trim() : null)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(Role.MEMBER)
                .status("ACTIVE")
                .failedAttempts(0)
                .tokenVersion(1)
                .createdAt(now)
                .updatedAt(now)
                .isDeleted(false)
                .build();

        User savedUser = userRepository.save(newUser);

        if (memberRepository != null) {
            try {
                Optional<com.championsclub.member.domain.Member> existingMemberOpt = memberRepository.findByEmailAndIsDeletedFalse(normalizedEmail);
                if (existingMemberOpt.isPresent()) {
                    com.championsclub.member.domain.Member existing = existingMemberOpt.get();
                    existing.setUser(savedUser);
                    if (StringUtils.hasText(savedUser.getPhone()) && (existing.getPhone() == null || existing.getPhone().isBlank())) {
                        existing.setPhone(savedUser.getPhone());
                    }
                    memberRepository.save(existing);
                } else {
                    Long seq = null;
                    try {
                        seq = memberRepository.getNextMemberSequence();
                    } catch (Exception ignored) {}
                    String memberNo = String.format("CC-%06d", seq != null ? seq : (System.currentTimeMillis() % 1000000));

                    com.championsclub.member.domain.Plan plan = null;
                    if (planRepository != null) {
                        plan = planRepository.findByCode("BRONZE")
                                .or(() -> planRepository.findByCode("STANDARD"))
                                .or(() -> planRepository.findByActiveTrue().stream().findFirst())
                                .orElse(null);
                    }

                    com.championsclub.member.domain.Member newMember = com.championsclub.member.domain.Member.builder()
                            .memberNo(memberNo)
                            .fullName(savedUser.getFullName())
                            .email(normalizedEmail)
                            .phone(StringUtils.hasText(savedUser.getPhone()) ? savedUser.getPhone() : "+91 99999 00000")
                            .dob(java.time.LocalDate.now().minusYears(25))
                            .status(com.championsclub.member.domain.MemberStatus.ACTIVE)
                            .plan(plan)
                            .user(savedUser)
                            .startDate(java.time.LocalDate.now())
                            .endDate(java.time.LocalDate.now().plusYears(1))
                            .walletBalance(java.math.BigDecimal.ZERO)
                            .guestPassesRemaining(0)
                            .build();
                    memberRepository.save(newMember);
                }
            } catch (Exception e) {
                log.warn("Could not automatically link or provision Member entity for registered user {}: {}", savedUser.getEmail(), e.getMessage());
            }
        }

        // Generate initial authentication session
        String accessToken = tokenProvider.generateAccessToken(
                savedUser.getId(),
                savedUser.getEmail(),
                savedUser.getRole(),
                savedUser.getTokenVersion()
        );

        String rawRefreshToken = tokenProvider.generateSecureRandomToken();
        String tokenHash = tokenProvider.hashToken(rawRefreshToken);

        RefreshToken refreshToken = RefreshToken.builder()
                .user(savedUser)
                .tokenHash(tokenHash)
                .familyId(UUID.randomUUID())
                .expiresAt(now.plus(Duration.ofDays(7)))
                .ip(ipAddress)
                .userAgent(userAgent)
                .createdAt(now)
                .build();
        refreshTokenRepository.save(refreshToken);

        auditService.record(savedUser.getId(), "USER_REGISTERED", "USER", savedUser.getId().toString(), "New member self-registration", ipAddress);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(rawRefreshToken)
                .tokenType("Bearer")
                .expiresInSeconds(tokenProvider.getAccessTokenExpirationSeconds())
                .user(UserDto.fromEntity(savedUser))
                .build();
    }

    @Transactional
    public synchronized TokenRefreshResponse refresh(String rawRefreshToken, String ipAddress, String userAgent) {
        if (!StringUtils.hasText(rawRefreshToken)) {
            throw new ChampionsClubException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "Refresh token is missing.");
        }

        String tokenHash = tokenProvider.hashToken(rawRefreshToken);
        Optional<RefreshToken> tokenOpt = refreshTokenRepository.findByTokenHash(tokenHash);

        if (tokenOpt.isEmpty()) {
            throw new ChampionsClubException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "Invalid refresh token.");
        }

        RefreshToken currentToken = tokenOpt.get();
        Instant now = clock.instant();

        // Reuse Detection: If token is already revoked, revoke whole family!
        if (currentToken.isRevoked()) {
            refreshTokenRepository.revokeFamily(currentToken.getFamilyId(), now);
            User user = currentToken.getUser();
            user.setTokenVersion(user.getTokenVersion() + 1);
            userRepository.save(user);

            auditService.record(
                    user.getId(),
                    "REFRESH_TOKEN_REUSE_DETECTED",
                    "REFRESH_TOKEN",
                    currentToken.getId().toString(),
                    "Attempted reuse of revoked token. Invalidated token family " + currentToken.getFamilyId(),
                    ipAddress
            );
            throw new ChampionsClubException(
                    HttpStatus.UNAUTHORIZED,
                    "REFRESH_TOKEN_REUSE",
                    "Security alert: Refresh token reuse detected. All sessions have been terminated."
            );
        }

        if (currentToken.isExpired(now)) {
            throw new ChampionsClubException(HttpStatus.UNAUTHORIZED, "REFRESH_TOKEN_EXPIRED", "Refresh token expired. Please log in again.");
        }

        User user = currentToken.getUser();
        if (user.isDeleted() || !"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            throw new ChampionsClubException(HttpStatus.UNAUTHORIZED, "USER_INACTIVE", "User account is not active.");
        }

        // Revoke current token in rotation
        currentToken.setRevokedAt(now);

        // Generate new token in same family
        String newRawRefreshToken = tokenProvider.generateSecureRandomToken();
        String newTokenHash = tokenProvider.hashToken(newRawRefreshToken);

        RefreshToken nextToken = RefreshToken.builder()
                .user(user)
                .tokenHash(newTokenHash)
                .familyId(currentToken.getFamilyId())
                .expiresAt(now.plus(Duration.ofDays(7)))
                .ip(ipAddress)
                .userAgent(userAgent)
                .createdAt(now)
                .build();

        RefreshToken savedNext = refreshTokenRepository.save(nextToken);
        currentToken.setReplacedBy(savedNext.getId());
        refreshTokenRepository.save(currentToken);

        String newAccessToken = tokenProvider.generateAccessToken(
                user.getId(),
                user.getEmail(),
                user.getRole(),
                user.getTokenVersion()
        );

        return TokenRefreshResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRawRefreshToken)
                .tokenType("Bearer")
                .expiresInSeconds(tokenProvider.getAccessTokenExpirationSeconds())
                .build();
    }

    @Transactional
    public void logout(String rawRefreshToken, String ipAddress) {
        if (StringUtils.hasText(rawRefreshToken)) {
            String tokenHash = tokenProvider.hashToken(rawRefreshToken);
            refreshTokenRepository.findByTokenHash(tokenHash).ifPresent(token -> {
                token.setRevokedAt(clock.instant());
                refreshTokenRepository.save(token);
                auditService.record(token.getUser().getId(), "LOGOUT", "USER", token.getUser().getId().toString(), "Single session logged out", ipAddress);
            });
        }
    }

    @Transactional
    public void logoutAll(String email, String ipAddress) {
        Optional<User> userOpt = userRepository.findByEmailAndIsDeletedFalse(email.trim().toLowerCase());
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            Instant now = clock.instant();
            user.setTokenVersion(user.getTokenVersion() + 1);
            user.setUpdatedAt(now);
            userRepository.save(user);

            refreshTokenRepository.revokeAllForUser(user.getId(), now);
            auditService.record(user.getId(), "LOGOUT_ALL_SESSIONS", "USER", user.getId().toString(), "All active sessions revoked", ipAddress);
        }
    }

    @Transactional
    public void forgotPassword(String email, String ipAddress) {
        String normalizedEmail = email.trim().toLowerCase();
        Optional<User> userOpt = userRepository.findByEmailAndIsDeletedFalse(normalizedEmail);

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            Instant now = clock.instant();

            passwordResetTokenRepository.invalidateAllForUser(user.getId(), now);

            String rawToken = tokenProvider.generateSecureRandomToken();
            String tokenHash = tokenProvider.hashToken(rawToken);

            PasswordResetToken resetToken = PasswordResetToken.builder()
                    .user(user)
                    .tokenHash(tokenHash)
                    .expiresAt(now.plus(Duration.ofMinutes(30)))
                    .createdAt(now)
                    .build();
            passwordResetTokenRepository.save(resetToken);

            log.info("==========================================================================");
            log.info("PASSWORD RESET STUB for email [{}] -> Token: {}", user.getEmail(), rawToken);
            log.info("Reset Link: http://localhost:5173/reset-password?token={}", rawToken);
            log.info("==========================================================================");

            auditService.record(user.getId(), "PASSWORD_RESET_REQUESTED", "USER", user.getId().toString(), "Password reset token generated", ipAddress);
        } else {
            log.info("Forgot password requested for non-existent email [{}]. Generic response sent.", normalizedEmail);
        }
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request, String ipAddress) {
        String tokenHash = tokenProvider.hashToken(request.getToken().trim());
        Optional<PasswordResetToken> tokenOpt = passwordResetTokenRepository.findByTokenHashAndUsedAtIsNull(tokenHash);

        if (tokenOpt.isEmpty() || tokenOpt.get().isExpired(clock.instant())) {
            throw new BusinessValidationException("Invalid or expired password reset token.");
        }

        PasswordResetToken resetToken = tokenOpt.get();
        passwordPolicyValidator.validate(request.getNewPassword());

        User user = resetToken.getUser();
        Instant now = clock.instant();

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setFailedAttempts(0);
        user.setLockedUntil(null);
        if ("LOCKED".equalsIgnoreCase(user.getStatus())) {
            user.setStatus("ACTIVE");
        }
        user.setTokenVersion(user.getTokenVersion() + 1);
        user.setUpdatedAt(now);
        userRepository.save(user);

        resetToken.setUsedAt(now);
        passwordResetTokenRepository.save(resetToken);

        refreshTokenRepository.revokeAllForUser(user.getId(), now);

        auditService.record(user.getId(), "PASSWORD_RESET_COMPLETED", "USER", user.getId().toString(), "Password reset completed successfully", ipAddress);
    }

    @Transactional
    public void changePassword(String email, ChangePasswordRequest request, String ipAddress) {
        User user = userRepository.findByEmailAndIsDeletedFalse(email.trim().toLowerCase())
                .orElseThrow(() -> new ChampionsClubException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found."));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Current password is incorrect.");
        }

        passwordPolicyValidator.validate(request.getNewPassword());

        Instant now = clock.instant();
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setTokenVersion(user.getTokenVersion() + 1);
        user.setUpdatedAt(now);
        userRepository.save(user);

        refreshTokenRepository.revokeAllForUser(user.getId(), now);

        auditService.record(user.getId(), "PASSWORD_CHANGED", "USER", user.getId().toString(), "Password changed via authenticated profile", ipAddress);
    }

    public UserDto getMe(String email) {
        User user = userRepository.findByEmailAndIsDeletedFalse(email.trim().toLowerCase())
                .orElseThrow(() -> new ChampionsClubException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found."));
        return UserDto.fromEntity(user);
    }
}
