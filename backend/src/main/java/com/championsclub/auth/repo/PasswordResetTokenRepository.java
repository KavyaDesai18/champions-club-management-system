package com.championsclub.auth.repo;

import com.championsclub.auth.domain.PasswordResetToken;
import com.championsclub.member.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    Optional<PasswordResetToken> findByTokenHashAndUsedAtIsNull(String tokenHash);

    @Modifying
    @Query("UPDATE PasswordResetToken p SET p.usedAt = :now WHERE p.user.id = :userId AND p.usedAt IS NULL")
    int invalidateAllForUser(@Param("userId") UUID userId, @Param("now") Instant now);
}
