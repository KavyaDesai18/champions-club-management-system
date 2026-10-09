package com.championsclub.bar.repo;

import com.championsclub.bar.domain.MenuCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MenuCategoryRepository extends JpaRepository<MenuCategory, UUID> {
    List<MenuCategory> findAllByIsActiveTrueOrderByDisplayOrderAsc();
    Optional<MenuCategory> findByCode(String code);
}
