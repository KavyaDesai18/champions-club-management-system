package com.championsclub.social.repo;

import com.championsclub.social.domain.SocialParticipant;
import com.championsclub.social.domain.SocialParticipantStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SocialParticipantRepository extends JpaRepository<SocialParticipant, UUID> {

    long countBySessionIdAndStatus(UUID sessionId, SocialParticipantStatus status);

    List<SocialParticipant> findBySessionIdOrderByJoinedAtAsc(UUID sessionId);

    List<SocialParticipant> findBySessionIdAndStatusOrderByJoinedAtAsc(
            UUID sessionId, SocialParticipantStatus status
    );

    @Query("SELECT p FROM SocialParticipant p WHERE p.session.id = :sessionId " +
           "AND p.member.id = :memberId AND p.status != 'CANCELLED'")
    Optional<SocialParticipant> findActiveBySessionAndMember(
            @Param("sessionId") UUID sessionId,
            @Param("memberId") UUID memberId
    );

    @Query("SELECT p FROM SocialParticipant p WHERE p.session.id = :sessionId " +
           "AND p.guestPhone = :phone AND p.status != 'CANCELLED'")
    Optional<SocialParticipant> findActiveBySessionAndGuestPhone(
            @Param("sessionId") UUID sessionId,
            @Param("phone") String phone
    );

    Optional<SocialParticipant> findFirstBySessionIdAndStatusOrderByJoinedAtAsc(
            UUID sessionId, SocialParticipantStatus status
    );

    List<SocialParticipant> findByMemberIdAndStatusOrderByJoinedAtDesc(
            UUID memberId, SocialParticipantStatus status
    );

    @Query("SELECT COUNT(p) FROM SocialParticipant p " +
           "WHERE p.member.id = :memberId " +
           "AND p.status = 'JOINED' " +
           "AND p.session.countsTowardDailyQuota = true " +
           "AND p.session.startAt >= :dayStart AND p.session.startAt < :dayEnd")
    long countMemberDailySocialSessions(
            @Param("memberId") UUID memberId,
            @Param("dayStart") Instant dayStart,
            @Param("dayEnd") Instant dayEnd
    );
}
