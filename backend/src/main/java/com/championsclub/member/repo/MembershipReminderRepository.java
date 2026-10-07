package com.championsclub.member.repo;

import com.championsclub.member.domain.MembershipReminder;
import com.championsclub.member.domain.ReminderType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface MembershipReminderRepository extends JpaRepository<MembershipReminder, UUID> {
    boolean existsByMemberIdAndMembershipIdAndReminderType(UUID memberId, UUID membershipId, ReminderType reminderType);
}
