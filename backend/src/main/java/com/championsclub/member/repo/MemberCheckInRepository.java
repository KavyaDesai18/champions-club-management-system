package com.championsclub.member.repo;

import com.championsclub.member.domain.MemberCheckIn;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MemberCheckInRepository extends JpaRepository<MemberCheckIn, UUID> {

    @Query("""
        SELECT c FROM MemberCheckIn c
        WHERE c.member.id = :memberId
        ORDER BY c.checkedInAt DESC
        LIMIT 1
    """)
    Optional<MemberCheckIn> findLatestByMemberId(@Param("memberId") UUID memberId);

    @Query("""
        SELECT c FROM MemberCheckIn c
        WHERE c.member.id = :memberId
          AND c.checkedInAt >= :since
        ORDER BY c.checkedInAt DESC
        LIMIT 1
    """)
    Optional<MemberCheckIn> findRecentCheckIn(@Param("memberId") UUID memberId, @Param("since") Instant since);

    Page<MemberCheckIn> findByOrderByCheckedInAtDesc(Pageable pageable);

    Page<MemberCheckIn> findByMemberIdOrderByCheckedInAtDesc(UUID memberId, Pageable pageable);
}
