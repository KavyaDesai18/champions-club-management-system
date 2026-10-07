package com.championsclub.member.repo;

import com.championsclub.member.domain.MembershipEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MembershipEventRepository extends JpaRepository<MembershipEvent, UUID> {
    List<MembershipEvent> findByMemberIdOrderByCreatedAtDesc(UUID memberId);
    List<MembershipEvent> findByMembershipIdOrderByCreatedAtDesc(UUID membershipId);
}
