package com.championsclub.shop.repo;

import com.championsclub.shop.domain.OrderStatusLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface OrderStatusLogRepository extends JpaRepository<OrderStatusLog, UUID> {
    List<OrderStatusLog> findByOrderIdOrderByCreatedAtAsc(UUID orderId);
}
