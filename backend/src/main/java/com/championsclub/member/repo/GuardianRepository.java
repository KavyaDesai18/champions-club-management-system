package com.championsclub.member.repo;

import com.championsclub.member.domain.Guardian;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface GuardianRepository extends JpaRepository<Guardian, UUID> {
    Optional<Guardian> findByMemberId(UUID memberId);
}
