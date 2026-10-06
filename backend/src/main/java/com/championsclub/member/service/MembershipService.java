package com.championsclub.member.service;

import com.championsclub.common.audit.AuditService;
import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.ResourceNotFoundException;
import com.championsclub.common.money.Money;
import com.championsclub.common.security.Role;
import com.championsclub.common.time.ClubTimeUtils;
import com.championsclub.member.domain.Membership;
import com.championsclub.member.domain.MembershipTier;
import com.championsclub.member.domain.User;
import com.championsclub.member.dto.CreateMemberRequest;
import com.championsclub.member.dto.MemberProfileDto;
import com.championsclub.member.dto.WalletTopUpRequest;
import com.championsclub.member.repo.MembershipRepository;
import com.championsclub.member.repo.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Service
public class MembershipService {

    private final UserRepository userRepository;
    private final MembershipRepository membershipRepository;
    private final PasswordEncoder passwordEncoder;
    private final ClubTimeUtils timeUtils;
    private final AuditService auditService;

    public MembershipService(
            UserRepository userRepository,
            MembershipRepository membershipRepository,
            PasswordEncoder passwordEncoder,
            ClubTimeUtils timeUtils,
            AuditService auditService
    ) {
        this.userRepository = userRepository;
        this.membershipRepository = membershipRepository;
        this.passwordEncoder = passwordEncoder;
        this.timeUtils = timeUtils;
        this.auditService = auditService;
    }

    @Transactional
    public MemberProfileDto registerMember(CreateMemberRequest request, String clientIp) {
        if (userRepository.existsByEmailAndIsDeletedFalse(request.getEmail())) {
            throw new BusinessValidationException("Email is already registered: " + request.getEmail(), "EMAIL_ALREADY_EXISTS");
        }

        Instant now = timeUtils.now();
        LocalDate today = timeUtils.currentClubDate();

        User user = User.builder()
                .email(request.getEmail().toLowerCase().trim())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .phone(request.getPhone())
                .role(Role.MEMBER)
                .status("ACTIVE")
                .createdAt(now)
                .updatedAt(now)
                .build();

        User savedUser = userRepository.save(user);

        int initialGuestPasses = (request.getTier() == MembershipTier.GOLD) ? 2 : 0;

        Membership membership = Membership.builder()
                .user(savedUser)
                .tier(request.getTier())
                .startDate(today)
                .endDate(today.plusYears(1))
                .walletBalance(Money.ZERO.getAmount())
                .guestPassesRemaining(initialGuestPasses)
                .active(true)
                .createdAt(now)
                .updatedAt(now)
                .build();

        Membership savedMembership = membershipRepository.save(membership);

        auditService.record(
                savedUser.getId(),
                "REGISTER_MEMBER",
                "Membership",
                savedMembership.getId().toString(),
                "Registered member with tier: " + request.getTier(),
                clientIp
        );

        return mapToProfile(savedUser, savedMembership);
    }

    @Transactional(readOnly = true)
    public MemberProfileDto getProfile(UUID userId) {
        User user = userRepository.findById(userId)
                .filter(u -> !u.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        Membership membership = membershipRepository.findByUserIdAndActiveTrueAndIsDeletedFalse(userId)
                .orElse(null);

        return mapToProfile(user, membership);
    }

    @Transactional
    public MemberProfileDto topUpWallet(UUID userId, WalletTopUpRequest request, String clientIp) {
        Membership membership = membershipRepository.findByUserIdAndActiveTrueAndIsDeletedFalse(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Active Membership for user", userId));

        Money currentBalance = Money.of(membership.getWalletBalance());
        Money topUp = Money.of(request.getAmount());
        Money newBalance = currentBalance.add(topUp);

        membership.setWalletBalance(newBalance.getAmount());
        membership.setUpdatedAt(timeUtils.now());
        membershipRepository.save(membership);

        auditService.record(
                userId,
                "TOP_UP_WALLET",
                "Membership",
                membership.getId().toString(),
                "Wallet top up by " + topUp + ", new balance: " + newBalance,
                clientIp
        );

        return mapToProfile(membership.getUser(), membership);
    }

    private MemberProfileDto mapToProfile(User user, Membership membership) {
        return MemberProfileDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .role(user.getRole())
                .tier(membership != null ? membership.getTier() : null)
                .walletBalance(membership != null ? membership.getWalletBalance() : Money.ZERO.getAmount())
                .guestPassesRemaining(membership != null ? membership.getGuestPassesRemaining() : 0)
                .active(membership != null && membership.isActive())
                .build();
    }
}
