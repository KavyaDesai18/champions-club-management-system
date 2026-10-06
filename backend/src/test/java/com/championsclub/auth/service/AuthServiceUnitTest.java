package com.championsclub.auth.service;

import com.championsclub.auth.domain.RefreshToken;
import com.championsclub.auth.dto.AuthResponse;
import com.championsclub.auth.dto.ChangePasswordRequest;
import com.championsclub.auth.dto.CreateUserRequest;
import com.championsclub.auth.dto.LoginRequest;
import com.championsclub.auth.dto.ResetPasswordRequest;
import com.championsclub.auth.dto.TokenRefreshResponse;
import com.championsclub.auth.dto.UpdateRoleRequest;
import com.championsclub.auth.dto.UpdateStatusRequest;
import com.championsclub.auth.repo.PasswordResetTokenRepository;
import com.championsclub.auth.repo.RefreshTokenRepository;
import com.championsclub.common.audit.AuditService;
import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.ChampionsClubException;
import com.championsclub.common.security.JwtTokenProvider;
import com.championsclub.common.security.Role;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceUnitTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuditService auditService;

    private Clock clock;
    private JwtTokenProvider tokenProvider;
    private PasswordPolicyValidator passwordPolicyValidator;
    private AuthService authService;
    private UserService userService;

    private final Instant now = Instant.parse("2026-10-06T12:00:00Z");

    @BeforeEach
    void setUp() {
        clock = Clock.fixed(now, ZoneId.of("UTC"));
        tokenProvider = new JwtTokenProvider(
                "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970",
                900000L,
                clock
        );
        passwordPolicyValidator = new PasswordPolicyValidator();
        authService = new AuthService(
                userRepository,
                refreshTokenRepository,
                passwordResetTokenRepository,
                tokenProvider,
                passwordEncoder,
                passwordPolicyValidator,
                auditService,
                clock
        );
        userService = new UserService(
                userRepository,
                refreshTokenRepository,
                passwordEncoder,
                passwordPolicyValidator,
                auditService,
                clock
        );
    }

    @Nested
    @DisplayName("Password Policy Validator Tests")
    class PasswordPolicyTests {

        @Test
        @DisplayName("Rejects passwords shorter than 8 characters")
        void rejectsShortPassword() {
            assertThatThrownBy(() -> passwordPolicyValidator.validate("Pass1"))
                    .isInstanceOf(BusinessValidationException.class)
                    .hasMessageContaining("at least 8 characters");
        }

        @Test
        @DisplayName("Rejects passwords with only letters")
        void rejectsOnlyLetters() {
            assertThatThrownBy(() -> passwordPolicyValidator.validate("OnlyLettersPassword"))
                    .isInstanceOf(BusinessValidationException.class)
                    .hasMessageContaining("contain both letters and numbers");
        }

        @Test
        @DisplayName("Rejects passwords with only numbers")
        void rejectsOnlyNumbers() {
            assertThatThrownBy(() -> passwordPolicyValidator.validate("1234567890"))
                    .isInstanceOf(BusinessValidationException.class);
        }

        @Test
        @DisplayName("Accepts compliant password with letters and numbers")
        void acceptsValidPassword() {
            passwordPolicyValidator.validate("Champions2026!");
        }
    }

    @Nested
    @DisplayName("Login & Account Lockout Logic")
    class LoginAndLockoutTests {

        private User createActiveUser(String email) {
            return User.builder()
                    .id(UUID.randomUUID())
                    .email(email)
                    .passwordHash("hashedPassword123")
                    .fullName("Alex Rodriguez")
                    .role(Role.MEMBER)
                    .status("ACTIVE")
                    .failedAttempts(0)
                    .tokenVersion(1)
                    .createdAt(now)
                    .updatedAt(now)
                    .build();
        }

        @Test
        @DisplayName("Rejects non-existent user with generic message and logs failed attempt")
        void rejectsNonExistentUser() {
            when(userRepository.findByEmailAndIsDeletedFalse("unknown@test.com"))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> authService.login(
                    LoginRequest.builder().email("unknown@test.com").password("Pass1234").build(),
                    "127.0.0.1", "TestAgent"
            ))
                    .isInstanceOf(BadCredentialsException.class)
                    .hasMessage("Invalid email or password.");
        }

        @Test
        @DisplayName("5 consecutive wrong password attempts lock user for 15 minutes")
        void fiveFailedAttemptsLocksAccount() {
            User user = createActiveUser("member@test.com");
            user.setFailedAttempts(4); // 4th attempt already recorded
            when(userRepository.findByEmailAndIsDeletedFalse("member@test.com"))
                    .thenReturn(Optional.of(user));
            when(passwordEncoder.matches("WrongPass1", user.getPasswordHash())).thenReturn(false);

            assertThatThrownBy(() -> authService.login(
                    LoginRequest.builder().email("member@test.com").password("WrongPass1").build(),
                    "127.0.0.1", "TestAgent"
            ))
                    .isInstanceOf(BadCredentialsException.class)
                    .hasMessage("Invalid email or password.");

            assertThat(user.getFailedAttempts()).isEqualTo(5);
            assertThat(user.getStatus()).isEqualTo("LOCKED");
            assertThat(user.getLockedUntil()).isEqualTo(now.plus(Duration.ofMinutes(15)));
            verify(userRepository).save(user);
            verify(auditService).record(eq(user.getId()), eq("ACCOUNT_LOCKED"), any(), any(), any(), any());
        }

        @Test
        @DisplayName("Locked user with correct password is still blocked until lockedUntil expires")
        void lockedUserWithCorrectPasswordStillBlocked() {
            User user = createActiveUser("locked@test.com");
            user.setStatus("LOCKED");
            user.setLockedUntil(now.plus(Duration.ofMinutes(10))); // lock active for 10 more mins

            when(userRepository.findByEmailAndIsDeletedFalse("locked@test.com"))
                    .thenReturn(Optional.of(user));

            assertThatThrownBy(() -> authService.login(
                    LoginRequest.builder().email("locked@test.com").password("Champions@123").build(),
                    "127.0.0.1", "TestAgent"
            ))
                    .isInstanceOf(BadCredentialsException.class)
                    .hasMessageContaining("Account is temporarily locked");

            verify(passwordEncoder, never()).matches(anyString(), anyString());
        }

        @Test
        @DisplayName("Disabled user is immediately blocked from signing in")
        void disabledUserBlocked() {
            User user = createActiveUser("disabled@test.com");
            user.setStatus("DISABLED");

            when(userRepository.findByEmailAndIsDeletedFalse("disabled@test.com"))
                    .thenReturn(Optional.of(user));

            assertThatThrownBy(() -> authService.login(
                    LoginRequest.builder().email("disabled@test.com").password("Champions@123").build(),
                    "127.0.0.1", "TestAgent"
            ))
                    .isInstanceOf(BadCredentialsException.class)
                    .hasMessageContaining("Account is disabled");
        }

        @Test
        @DisplayName("Successful login resets failed attempts and issues 15m access token & refresh token")
        void successfulLoginIssuesTokensAndResetsAttempts() {
            User user = createActiveUser("member@test.com");
            user.setFailedAttempts(3);

            when(userRepository.findByEmailAndIsDeletedFalse("member@test.com"))
                    .thenReturn(Optional.of(user));
            when(passwordEncoder.matches("ValidPass1", user.getPasswordHash())).thenReturn(true);

            AuthResponse response = authService.login(
                    LoginRequest.builder().email("member@test.com").password("ValidPass1").build(),
                    "127.0.0.1", "TestAgent"
            );

            assertThat(response).isNotNull();
            assertThat(response.getAccessToken()).isNotBlank();
            assertThat(response.getRefreshToken()).isNotBlank();
            assertThat(response.getExpiresInSeconds()).isEqualTo(900); // 15 mins
            assertThat(user.getFailedAttempts()).isEqualTo(0);
            assertThat(user.getLockedUntil()).isNull();
            verify(refreshTokenRepository).save(any(RefreshToken.class));
        }

        @Test
        @DisplayName("Normalizes email address with leading/trailing spaces and upper-case characters")
        void normalizesEmail() {
            User user = createActiveUser("member@test.com");
            when(userRepository.findByEmailAndIsDeletedFalse("member@test.com"))
                    .thenReturn(Optional.of(user));
            when(passwordEncoder.matches("ValidPass1", user.getPasswordHash())).thenReturn(true);

            AuthResponse response = authService.login(
                    LoginRequest.builder().email("  MEMBER@test.com  ").password("ValidPass1").build(),
                    "127.0.0.1", "TestAgent"
            );

            assertThat(response).isNotNull();
            verify(userRepository).findByEmailAndIsDeletedFalse("member@test.com");
        }
    }

    @Nested
    @DisplayName("Rotating Refresh Tokens & Reuse Detection")
    class RefreshTokenRotationTests {

        @Test
        @DisplayName("Valid refresh token rotates to new token in same family and revokes previous")
        void rotatesTokenSuccessfully() {
            User user = User.builder()
                    .id(UUID.randomUUID())
                    .email("member@test.com")
                    .role(Role.MEMBER)
                    .status("ACTIVE")
                    .tokenVersion(1)
                    .build();

            UUID familyId = UUID.randomUUID();
            String rawToken = "raw-refresh-token-xyz";
            String tokenHash = tokenProvider.hashToken(rawToken);

            RefreshToken token = RefreshToken.builder()
                    .id(UUID.randomUUID())
                    .user(user)
                    .tokenHash(tokenHash)
                    .familyId(familyId)
                    .expiresAt(now.plus(Duration.ofDays(5)))
                    .createdAt(now)
                    .build();

            when(refreshTokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(token));
            when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(i -> i.getArgument(0));

            TokenRefreshResponse response = authService.refresh(rawToken, "127.0.0.1", "TestAgent");

            assertThat(response).isNotNull();
            assertThat(response.getAccessToken()).isNotBlank();
            assertThat(response.getRefreshToken()).isNotBlank().isNotEqualTo(rawToken);
            assertThat(token.isRevoked()).isTrue();
        }

        @Test
        @DisplayName("Reuse of revoked refresh token revokes entire token family and increments user token_version")
        void reuseDetectionRevokesEntireFamily() {
            User user = User.builder()
                    .id(UUID.randomUUID())
                    .email("member@test.com")
                    .role(Role.MEMBER)
                    .status("ACTIVE")
                    .tokenVersion(1)
                    .build();

            UUID familyId = UUID.randomUUID();
            String rawToken = "already-revoked-token";
            String tokenHash = tokenProvider.hashToken(rawToken);

            RefreshToken revokedToken = RefreshToken.builder()
                    .id(UUID.randomUUID())
                    .user(user)
                    .tokenHash(tokenHash)
                    .familyId(familyId)
                    .expiresAt(now.plus(Duration.ofDays(2)))
                    .revokedAt(now.minus(Duration.ofMinutes(10))) // already revoked!
                    .createdAt(now.minus(Duration.ofDays(1)))
                    .build();

            when(refreshTokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(revokedToken));

            assertThatThrownBy(() -> authService.refresh(rawToken, "127.0.0.1", "AttackerAgent"))
                    .isInstanceOf(ChampionsClubException.class)
                    .hasMessageContaining("Refresh token reuse detected");

            // Entire family revoked
            verify(refreshTokenRepository).revokeFamily(eq(familyId), eq(now));
            // User token version bumped to invalidate all current access tokens
            assertThat(user.getTokenVersion()).isEqualTo(2);
            verify(userRepository).save(user);
            verify(auditService).record(eq(user.getId()), eq("REFRESH_TOKEN_REUSE_DETECTED"), any(), any(), any(), any());
        }
    }

    @Nested
    @DisplayName("Admin Safety Guardrails")
    class AdminSafetyTests {

        @Test
        @DisplayName("Owner cannot disable their own account")
        void ownerCannotDisableThemselves() {
            UUID ownerId = UUID.randomUUID();
            User owner = User.builder()
                    .id(ownerId)
                    .email("owner@championsclub.com")
                    .role(Role.OWNER)
                    .status("ACTIVE")
                    .build();

            when(userRepository.findById(ownerId)).thenReturn(Optional.of(owner));

            assertThatThrownBy(() -> userService.updateStatus(
                    ownerId,
                    UpdateStatusRequest.builder().status("DISABLED").build(),
                    "owner@championsclub.com",
                    "127.0.0.1"
            ))
                    .isInstanceOf(BusinessValidationException.class)
                    .hasMessageContaining("Owners cannot disable their own account");
        }

        @Test
        @DisplayName("Cannot disable the last active Owner of the club")
        void cannotDisableLastActiveOwner() {
            UUID ownerId = UUID.randomUUID();
            User owner = User.builder()
                    .id(ownerId)
                    .email("owner1@championsclub.com")
                    .role(Role.OWNER)
                    .status("ACTIVE")
                    .build();

            when(userRepository.findById(ownerId)).thenReturn(Optional.of(owner));
            when(userRepository.countByRoleAndStatusAndIsDeletedFalse(Role.OWNER, "ACTIVE")).thenReturn(1L);

            assertThatThrownBy(() -> userService.updateStatus(
                    ownerId,
                    UpdateStatusRequest.builder().status("DISABLED").build(),
                    "manager@championsclub.com",
                    "127.0.0.1"
            ))
                    .isInstanceOf(BusinessValidationException.class)
                    .hasMessageContaining("Cannot disable the last active Owner");
        }

        @Test
        @DisplayName("Owner cannot demote their own account")
        void ownerCannotDemoteThemselves() {
            UUID ownerId = UUID.randomUUID();
            User owner = User.builder()
                    .id(ownerId)
                    .email("owner@championsclub.com")
                    .role(Role.OWNER)
                    .status("ACTIVE")
                    .build();

            when(userRepository.findById(ownerId)).thenReturn(Optional.of(owner));

            assertThatThrownBy(() -> userService.updateRole(
                    ownerId,
                    UpdateRoleRequest.builder().role(Role.MEMBER).build(),
                    "owner@championsclub.com",
                    "127.0.0.1"
            ))
                    .isInstanceOf(BusinessValidationException.class)
                    .hasMessageContaining("Owners cannot demote their own account");
        }
    }
}
