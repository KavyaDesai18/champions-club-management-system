package com.championsclub.auth.service;

import com.championsclub.auth.dto.CreateUserRequest;
import com.championsclub.auth.dto.UpdateRoleRequest;
import com.championsclub.auth.dto.UpdateStatusRequest;
import com.championsclub.auth.dto.UpdateUserRequest;
import com.championsclub.auth.dto.UserDto;
import com.championsclub.auth.repo.RefreshTokenRepository;
import com.championsclub.common.audit.AuditService;
import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.ChampionsClubException;
import com.championsclub.common.security.Role;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicyValidator passwordPolicyValidator;
    private final AuditService auditService;
    private final Clock clock;

    public UserService(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            PasswordPolicyValidator passwordPolicyValidator,
            AuditService auditService,
            Clock clock
    ) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.passwordPolicyValidator = passwordPolicyValidator;
        this.auditService = auditService;
        this.clock = clock;
    }

    public Page<UserDto> getUsers(String search, Role role, Pageable pageable) {
        String cleanSearch = (search != null && !search.isBlank()) ? search.trim() : null;
        return userRepository.searchUsers(cleanSearch, role, pageable)
                .map(UserDto::fromEntity);
    }

    public UserDto getUserById(UUID id) {
        User user = userRepository.findById(id)
                .filter(u -> !u.isDeleted())
                .orElseThrow(() -> new ChampionsClubException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found."));
        return UserDto.fromEntity(user);
    }

    @Transactional
    public UserDto createUser(CreateUserRequest request, String adminEmail, String ipAddress) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmailAndIsDeletedFalse(normalizedEmail)) {
            throw new BusinessValidationException("A user with this email address already exists.");
        }

        passwordPolicyValidator.validate(request.getPassword());

        Instant now = clock.instant();
        User user = User.builder()
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .phone(request.getPhone() != null ? request.getPhone().trim() : null)
                .role(request.getRole())
                .status("ACTIVE")
                .failedAttempts(0)
                .tokenVersion(1)
                .createdAt(now)
                .updatedAt(now)
                .isDeleted(false)
                .build();

        User saved = userRepository.save(user);

        User admin = userRepository.findByEmailAndIsDeletedFalse(adminEmail.toLowerCase()).orElse(null);
        UUID adminId = admin != null ? admin.getId() : null;
        auditService.record(adminId, "USER_CREATED", "USER", saved.getId().toString(), "Created user with role " + saved.getRole(), ipAddress);

        return UserDto.fromEntity(saved);
    }

    @Transactional
    public UserDto updateUser(UUID id, UpdateUserRequest request, String adminEmail, String ipAddress) {
        User user = userRepository.findById(id)
                .filter(u -> !u.isDeleted())
                .orElseThrow(() -> new ChampionsClubException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found."));

        user.setFullName(request.getFullName().trim());
        user.setPhone(request.getPhone() != null ? request.getPhone().trim() : null);
        user.setUpdatedAt(clock.instant());
        User saved = userRepository.save(user);

        User admin = userRepository.findByEmailAndIsDeletedFalse(adminEmail.toLowerCase()).orElse(null);
        UUID adminId = admin != null ? admin.getId() : null;
        auditService.record(adminId, "USER_UPDATED", "USER", saved.getId().toString(), "Updated profile attributes", ipAddress);

        return UserDto.fromEntity(saved);
    }

    @Transactional
    public UserDto updateStatus(UUID id, UpdateStatusRequest request, String adminEmail, String ipAddress) {
        User targetUser = userRepository.findById(id)
                .filter(u -> !u.isDeleted())
                .orElseThrow(() -> new ChampionsClubException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found."));

        String newStatus = request.getStatus().trim().toUpperCase();
        if (!"ACTIVE".equals(newStatus) && !"DISABLED".equals(newStatus)) {
            throw new BusinessValidationException("Invalid status value. Permitted values: ACTIVE, DISABLED.");
        }

        // Edge case: OWNER cannot disable themselves or the last active OWNER
        if (targetUser.getRole() == Role.OWNER && !"ACTIVE".equals(newStatus)) {
            if (targetUser.getEmail().equalsIgnoreCase(adminEmail.trim())) {
                throw new BusinessValidationException("Owners cannot disable their own account.");
            }
            long activeOwners = userRepository.countByRoleAndStatusAndIsDeletedFalse(Role.OWNER, "ACTIVE");
            if (activeOwners <= 1) {
                throw new BusinessValidationException("Cannot disable the last active Owner of the club.");
            }
        }

        targetUser.setStatus(newStatus);
        if ("DISABLED".equals(newStatus)) {
            // Revoke all current tokens immediately
            targetUser.setTokenVersion(targetUser.getTokenVersion() + 1);
            refreshTokenRepository.revokeAllForUser(targetUser.getId(), clock.instant());
        }
        targetUser.setUpdatedAt(clock.instant());
        User saved = userRepository.save(targetUser);

        User admin = userRepository.findByEmailAndIsDeletedFalse(adminEmail.toLowerCase()).orElse(null);
        UUID adminId = admin != null ? admin.getId() : null;
        auditService.record(adminId, "USER_STATUS_CHANGED", "USER", saved.getId().toString(), "Status changed to " + newStatus, ipAddress);

        return UserDto.fromEntity(saved);
    }

    @Transactional
    public UserDto updateRole(UUID id, UpdateRoleRequest request, String adminEmail, String ipAddress) {
        User targetUser = userRepository.findById(id)
                .filter(u -> !u.isDeleted())
                .orElseThrow(() -> new ChampionsClubException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found."));

        Role newRole = request.getRole();

        // Edge case: OWNER cannot demote themselves or the last OWNER
        if (targetUser.getRole() == Role.OWNER && newRole != Role.OWNER) {
            if (targetUser.getEmail().equalsIgnoreCase(adminEmail.trim())) {
                throw new BusinessValidationException("Owners cannot demote their own account.");
            }
            long ownerCount = userRepository.countByRoleAndIsDeletedFalse(Role.OWNER);
            if (ownerCount <= 1) {
                throw new BusinessValidationException("Cannot reassign the role of the last remaining Owner.");
            }
        }

        Role oldRole = targetUser.getRole();
        targetUser.setRole(newRole);
        // Role changed mid-session: increment token version to take effect immediately or upon refresh
        targetUser.setTokenVersion(targetUser.getTokenVersion() + 1);
        refreshTokenRepository.revokeAllForUser(targetUser.getId(), clock.instant());
        targetUser.setUpdatedAt(clock.instant());
        User saved = userRepository.save(targetUser);

        User admin = userRepository.findByEmailAndIsDeletedFalse(adminEmail.toLowerCase()).orElse(null);
        UUID adminId = admin != null ? admin.getId() : null;
        auditService.record(adminId, "USER_ROLE_CHANGED", "USER", saved.getId().toString(), "Role changed from " + oldRole + " to " + newRole, ipAddress);

        return UserDto.fromEntity(saved);
    }

    @Transactional
    public void forceLogout(UUID id, String adminEmail, String ipAddress) {
        User targetUser = userRepository.findById(id)
                .filter(u -> !u.isDeleted())
                .orElseThrow(() -> new ChampionsClubException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found."));

        targetUser.setTokenVersion(targetUser.getTokenVersion() + 1);
        targetUser.setUpdatedAt(clock.instant());
        userRepository.save(targetUser);

        refreshTokenRepository.revokeAllForUser(targetUser.getId(), clock.instant());

        User admin = userRepository.findByEmailAndIsDeletedFalse(adminEmail.toLowerCase()).orElse(null);
        UUID adminId = admin != null ? admin.getId() : null;
        auditService.record(adminId, "USER_FORCE_LOGOUT", "USER", targetUser.getId().toString(), "Admin forced logout of all sessions", ipAddress);
    }
}
