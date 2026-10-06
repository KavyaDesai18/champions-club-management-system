package com.championsclub.auth.service;

import com.championsclub.common.security.Role;
import com.championsclub.member.domain.User;
import com.championsclub.member.repo.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;

@Component
public class OwnerDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(OwnerDataSeeder.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;

    private final String seedEmail;
    private final String seedPassword;
    private final String seedFullName;

    public OwnerDataSeeder(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            Clock clock,
            @Value("${app.seed.owner.email:owner@championsclub.com}") String seedEmail,
            @Value("${app.seed.owner.password:Champions@123}") String seedPassword,
            @Value("${app.seed.owner.name:Club Owner}") String seedFullName
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
        this.seedEmail = seedEmail;
        this.seedPassword = seedPassword;
        this.seedFullName = seedFullName;
    }

    @Override
    public void run(ApplicationArguments args) {
        long ownerCount = userRepository.countByRoleAndIsDeletedFalse(Role.OWNER);
        if (ownerCount == 0) {
            Instant now = clock.instant();
            String normalizedEmail = seedEmail.trim().toLowerCase();

            User owner = User.builder()
                    .email(normalizedEmail)
                    .passwordHash(passwordEncoder.encode(seedPassword))
                    .fullName(seedFullName)
                    .phone("+919876543210")
                    .role(Role.OWNER)
                    .status("ACTIVE")
                    .failedAttempts(0)
                    .tokenVersion(1)
                    .createdAt(now)
                    .updatedAt(now)
                    .isDeleted(false)
                    .build();

            userRepository.save(owner);
            log.info("Initialized default club OWNER account: [{}]", normalizedEmail);
        }
    }
}
