package com.championsclub.shop.repo;

import com.championsclub.shop.domain.Order;
import com.championsclub.shop.domain.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {

    Optional<Order> findByOrderNo(String orderNo);

    Optional<Order> findByIdempotencyKey(String idempotencyKey);

    Optional<Order> findByMemberIdAndStatus(UUID memberId, OrderStatus status);

    List<Order> findByMemberIdOrderByCreatedAtDesc(UUID memberId);

    List<Order> findByStatusOrderByCreatedAtDesc(OrderStatus status);

    List<Order> findByStatusInOrderByCreatedAtDesc(Collection<OrderStatus> statuses);

    List<Order> findByStatusAndPlacedAtBefore(OrderStatus status, Instant cutoff);

    @Query("SELECT o FROM Order o WHERE " +
           "(:status IS NULL OR o.status = :status) AND " +
           "(:channel IS NULL OR o.channel = :channel) AND " +
           "(:search IS NULL OR LOWER(o.orderNo) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(o.guestName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(o.pickupCode) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Order> searchOrders(
            @Param("status") OrderStatus status,
            @Param("channel") com.championsclub.shop.domain.OrderChannel channel,
            @Param("search") String search,
            Pageable pageable
    );

    @Query("SELECT o FROM Order o WHERE o.status != 'CANCELLED' AND o.createdAt >= :start AND o.createdAt <= :end")
    List<Order> findCompletedOrdersBetween(@Param("start") Instant start, @Param("end") Instant end);
}
