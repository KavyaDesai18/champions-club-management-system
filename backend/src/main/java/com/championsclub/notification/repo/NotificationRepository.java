package com.championsclub.notification.repo;

import com.championsclub.notification.domain.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    @Query("""
        SELECT n FROM Notification n
        WHERE (n.user.id = :userId OR n.member.user.id = :userId)
          AND (:unreadOnly = false OR n.read = false)
        ORDER BY n.createdAt DESC
    """)
    Page<Notification> findForUser(
            @Param("userId") UUID userId,
            @Param("unreadOnly") boolean unreadOnly,
            Pageable pageable
    );

    @Query("""
        SELECT COUNT(n) FROM Notification n
        WHERE (n.user.id = :userId OR n.member.user.id = :userId)
          AND n.read = false
    """)
    long countUnreadForUser(@Param("userId") UUID userId);

    @Modifying
    @Query("""
        UPDATE Notification n
        SET n.read = true, n.readAt = :readAt
        WHERE (n.user.id = :userId OR n.member.user.id = :userId)
          AND n.read = false
    """)
    int markAllReadForUser(@Param("userId") UUID userId, @Param("readAt") Instant readAt);
}
