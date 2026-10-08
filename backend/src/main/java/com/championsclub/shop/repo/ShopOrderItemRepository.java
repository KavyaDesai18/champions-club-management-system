package com.championsclub.shop.repo;

import com.championsclub.shop.domain.ShopOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ShopOrderItemRepository extends JpaRepository<ShopOrderItem, UUID> {
    List<ShopOrderItem> findByOrderId(UUID orderId);
}
