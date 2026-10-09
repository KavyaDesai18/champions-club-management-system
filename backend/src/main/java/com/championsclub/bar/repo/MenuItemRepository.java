package com.championsclub.bar.repo;

import com.championsclub.bar.domain.MenuItem;
import com.championsclub.bar.domain.StationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MenuItemRepository extends JpaRepository<MenuItem, UUID> {

    List<MenuItem> findAllByIsDeletedFalseOrderByCategoryDisplayOrderAscNameAsc();

    List<MenuItem> findAllByIsDeletedFalseAndIsAvailableTrueOrderByCategoryDisplayOrderAscNameAsc();

    List<MenuItem> findAllByCategoryIdAndIsDeletedFalseOrderByPriceAsc(UUID categoryId);

    List<MenuItem> findAllByPrepStationAndIsDeletedFalse(StationType prepStation);

    Optional<MenuItem> findByIdAndIsDeletedFalse(UUID id);
}
