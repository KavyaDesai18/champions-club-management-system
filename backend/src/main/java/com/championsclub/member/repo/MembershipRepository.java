package com.championsclub.member.repo;

import com.championsclub.member.domain.Membership;
import com.championsclub.member.domain.MembershipStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MembershipRepository extends JpaRepository<Membership, UUID> {

    // Legacy V1 compatibility
    Optional<Membership> findByUserIdAndActiveTrueAndIsDeletedFalse(UUID userId);

    // V4 Active membership lookup (Rule: at most one active membership per member)
    @Query("""
        SELECT m FROM Membership m
        WHERE m.member.id = :memberId
          AND m.status = com.championsclub.member.domain.MembershipStatus.ACTIVE
          AND m.isDeleted = false
    """)
    Optional<Membership> findActiveByMemberId(@Param("memberId") UUID memberId);

    // Active membership lookup by user ID
    @Query("""
        SELECT m FROM Membership m
        WHERE (m.member.user.id = :userId OR m.user.id = :userId)
          AND m.status = com.championsclub.member.domain.MembershipStatus.ACTIVE
          AND m.isDeleted = false
    """)
    Optional<Membership> findActiveByUserId(@Param("userId") UUID userId);

    // List all memberships for a member sorted newest first
    @Query("""
        SELECT m FROM Membership m
        LEFT JOIN FETCH m.plan
        WHERE m.member.id = :memberId AND m.isDeleted = false
        ORDER BY m.createdAt DESC
    """)
    List<Membership> findByMemberIdOrderByCreatedAtDesc(@Param("memberId") UUID memberId);

    // Catch-up / daily batch: find active memberships that have passed their expiry date (+ grace period)
    @Query("""
        SELECT m FROM Membership m
        JOIN FETCH m.member mem
        LEFT JOIN FETCH m.plan
        WHERE m.status = com.championsclub.member.domain.MembershipStatus.ACTIVE
          AND m.isDeleted = false
          AND m.endDate < :cutoffDate
    """)
    List<Membership> findActiveExpiredBefore(@Param("cutoffDate") LocalDate cutoffDate);

    // Reminder scan: find active memberships expiring on or before a milestone date
    @Query("""
        SELECT m FROM Membership m
        JOIN FETCH m.member mem
        LEFT JOIN FETCH m.plan
        WHERE m.status = com.championsclub.member.domain.MembershipStatus.ACTIVE
          AND m.isDeleted = false
          AND m.endDate <= :maxEndDate
          AND m.endDate >= :minEndDate
    """)
    List<Membership> findActiveExpiringBetween(
            @Param("minEndDate") LocalDate minEndDate,
            @Param("maxEndDate") LocalDate maxEndDate
    );

    // Staff console: filterable expiring memberships query
    @Query("""
        SELECT m FROM Membership m
        JOIN FETCH m.member mem
        LEFT JOIN FETCH m.plan p
        WHERE m.isDeleted = false
          AND (
            (:status IS NULL AND m.status IN (com.championsclub.member.domain.MembershipStatus.ACTIVE, com.championsclub.member.domain.MembershipStatus.EXPIRED))
            OR m.status = :status
          )
          AND (:planCode IS NULL OR UPPER(p.code) = UPPER(:planCode))
          AND (:maxEndDate IS NULL OR m.endDate <= :maxEndDate)
          AND (:minEndDate IS NULL OR m.endDate >= :minEndDate)
          AND (
            :search IS NULL
            OR LOWER(mem.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(mem.memberNo) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(mem.phone) LIKE LOWER(CONCAT('%', :search, '%'))
          )
        ORDER BY m.endDate ASC
    """)
    Page<Membership> searchExpiringMemberships(
            @Param("search") String search,
            @Param("status") MembershipStatus status,
            @Param("planCode") String planCode,
            @Param("minEndDate") LocalDate minEndDate,
            @Param("maxEndDate") LocalDate maxEndDate,
            Pageable pageable
    );
}
