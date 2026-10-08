package com.championsclub.shop.repo;

import com.championsclub.shop.domain.ShopOrder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ShopOrderRepository extends JpaRepository<ShopOrder, UUID> {
    Optional<ShopOrder> findByOrderNumber(String orderNumber);
    List<ShopOrder> findByMemberIdOrderByCreatedAtDesc(UUID memberId);
    Page<ShopOrder> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
