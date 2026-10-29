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
        ensureUser(seedEmail, Role.OWNER, seedFullName, "+919876543210");
        ensureUser("alice.frontdesk@championsclub.com", Role.FRONT_DESK, "Alice FrontDesk", "+919876543211");
        ensureUser("kitchen@championsclub.com", Role.KITCHEN, "Chef Antonio (Kitchen)", "+919876543212");
        ensureUser("manager@championsclub.com", Role.MANAGER, "General Manager", "+919876543213");
        ensureUser("coach@championsclub.com", Role.COACH, "Pullela Coach", "+919876543214");
        ensureUser("shop@championsclub.com", Role.SHOP_STAFF, "Shop Assistant", "+919876543215");
        ensureUser("bar@championsclub.com", Role.BAR_STAFF, "Bar Tender", "+919876543216");
    }

    private void ensureUser(String email, Role role, String fullName, String phone) {
        String normalizedEmail = email.trim().toLowerCase();
        if (userRepository.findByEmailAndIsDeletedFalse(normalizedEmail).isEmpty()) {
            Instant now = clock.instant();
            User user = User.builder()
                    .email(normalizedEmail)
                    .passwordHash(passwordEncoder.encode(seedPassword))
                    .fullName(fullName)
                    .phone(phone)
                    .role(role)
                    .status("ACTIVE")
                    .failedAttempts(0)
                    .tokenVersion(1)
                    .createdAt(now)
                    .updatedAt(now)
                    .isDeleted(false)
                    .build();
            userRepository.save(user);
            log.info("Initialized default club {} account: [{}]", role, normalizedEmail);
        }
    }
}
