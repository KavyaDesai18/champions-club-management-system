package com.championsclub.member.repo;

import com.championsclub.common.security.Role;
import com.championsclub.member.domain.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmailAndIsDeletedFalse(String email);

    boolean existsByEmailAndIsDeletedFalse(String email);

    long countByRoleAndStatusAndIsDeletedFalse(Role role, String status);

    long countByRoleAndIsDeletedFalse(Role role);

    java.util.List<User> findByRoleInAndStatusAndIsDeletedFalseOrderByCreatedAtAsc(java.util.Collection<Role> roles, String status);

    @Query("""
        SELECT u FROM User u
        WHERE u.isDeleted = false
          AND (:role IS NULL OR u.role = :role)
          AND (:search IS NULL OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
                             OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')))
        ORDER BY u.createdAt DESC
    """)
    Page<User> searchUsers(@Param("search") String search, @Param("role") Role role, Pageable pageable);
}
