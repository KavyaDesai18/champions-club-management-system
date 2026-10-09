package com.championsclub.bar.repo;

import com.championsclub.bar.domain.TabItem;
import com.championsclub.bar.domain.TabItemStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TabItemRepository extends JpaRepository<TabItem, UUID> {

    List<TabItem> findAllByTabIdOrderByCreatedAtAsc(UUID tabId);

    List<TabItem> findAllByTabIdAndStatusNot(UUID tabId, TabItemStatus status);

    List<TabItem> findAllByStatus(TabItemStatus status);
}
