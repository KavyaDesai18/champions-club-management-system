package com.championsclub.bar.repo;

import com.championsclub.bar.domain.TabSplit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TabSplitRepository extends JpaRepository<TabSplit, UUID> {

    List<TabSplit> findAllByTabIdOrderBySplitNumberAsc(UUID tabId);

    void deleteAllByTabId(UUID tabId);
}
