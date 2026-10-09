package com.championsclub.member.repo;

import com.championsclub.member.domain.Member;
import com.championsclub.member.domain.MemberStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MemberRepository extends JpaRepository<Member, UUID> {

    Optional<Member> findByIdAndIsDeletedFalse(UUID id);

    Optional<Member> findByMemberNoAndIsDeletedFalse(String memberNo);

    Optional<Member> findByEmailAndIsDeletedFalse(String email);

    Optional<Member> findByPhoneAndIsDeletedFalse(String phone);

    Optional<Member> findByUserIdAndIsDeletedFalse(UUID userId);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM Member m WHERE m.id = :id AND m.isDeleted = false")
    Optional<Member> findByIdWithLock(@Param("id") UUID id);

    boolean existsByEmailAndIsDeletedFalse(String email);

    boolean existsByPhoneAndIsDeletedFalse(String phone);

    boolean existsByMemberNo(String memberNo);

    @Query(value = "SELECT nextval('member_no_seq')", nativeQuery = true)
    Long getNextMemberSequence();

    @Query("SELECT m FROM Member m WHERE m.isDeleted = false " +
           "AND (:status IS NULL OR m.status = :status) " +
           "AND (:planCode IS NULL OR m.plan.code = :planCode) " +
           "AND (:search IS NULL OR :search = '' " +
           "     OR LOWER(m.fullName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(m.email) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR m.phone LIKE CONCAT('%', :search, '%') " +
           "     OR LOWER(m.memberNo) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Member> searchMembers(
            @Param("search") String search,
            @Param("status") MemberStatus status,
            @Param("planCode") String planCode,
            Pageable pageable
    );

    @Query("SELECT COALESCE(SUM(m.walletBalance), 0) FROM Member m WHERE m.isDeleted = false AND m.walletBalance > 0")
    BigDecimal sumUnsettledWalletBalances();

    @Query("SELECT COUNT(m) FROM Member m WHERE m.isDeleted = false AND m.status = 'ACTIVE'")
    long countActiveMembers();

    @Query("SELECT COUNT(m) FROM Member m WHERE m.isDeleted = false AND m.status = 'ACTIVE' AND m.endDate BETWEEN :today AND :cutoff")
    long countExpiringSoonMembers(@Param("today") LocalDate today, @Param("cutoff") LocalDate cutoff);

    @Query("SELECT COUNT(m) FROM Member m WHERE m.isDeleted = false AND m.status = 'EXPIRED'")
    long countExpiredMembers();
}
