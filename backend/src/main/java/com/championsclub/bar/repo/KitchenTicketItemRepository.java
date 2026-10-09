package com.championsclub.bar.repo;

import com.championsclub.bar.domain.KitchenTicketItem;
import com.championsclub.bar.domain.TabItemStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface KitchenTicketItemRepository extends JpaRepository<KitchenTicketItem, UUID> {

    List<KitchenTicketItem> findAllByTicketId(UUID ticketId);

    Optional<KitchenTicketItem> findByTabItemId(UUID tabItemId);

    List<KitchenTicketItem> findAllByStatus(TabItemStatus status);
}
