package com.championsclub.bar.service;

import com.championsclub.bar.domain.MenuCategory;
import com.championsclub.bar.domain.MenuItem;
import com.championsclub.bar.dto.MenuCategoryDto;
import com.championsclub.bar.dto.MenuItemDto;
import com.championsclub.bar.repo.MenuCategoryRepository;
import com.championsclub.bar.repo.MenuItemRepository;
import com.championsclub.common.error.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BarMenuService {

    private final MenuCategoryRepository categoryRepository;
    private final MenuItemRepository menuItemRepository;

    @Transactional(readOnly = true)
    public List<MenuCategoryDto> getMenuCatalog(boolean onlyAvailable) {
        List<MenuCategory> categories = categoryRepository.findAllByIsActiveTrueOrderByDisplayOrderAsc();
        List<MenuItem> items = onlyAvailable
                ? menuItemRepository.findAllByIsDeletedFalseAndIsAvailableTrueOrderByCategoryDisplayOrderAscNameAsc()
                : menuItemRepository.findAllByIsDeletedFalseOrderByCategoryDisplayOrderAscNameAsc();

        Map<UUID, List<MenuItemDto>> itemsByCategory = items.stream()
                .map(this::mapItemToDto)
                .collect(Collectors.groupingBy(MenuItemDto::getCategoryId));

        return categories.stream().map(cat -> MenuCategoryDto.builder()
                .id(cat.getId())
                .name(cat.getName())
                .code(cat.getCode())
                .displayOrder(cat.getDisplayOrder())
                .isActive(cat.getIsActive())
                .items(itemsByCategory.getOrDefault(cat.getId(), Collections.emptyList()))
                .build()
        ).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MenuItemDto> getAllMenuItems(boolean onlyAvailable) {
        List<MenuItem> items = onlyAvailable
                ? menuItemRepository.findAllByIsDeletedFalseAndIsAvailableTrueOrderByCategoryDisplayOrderAscNameAsc()
                : menuItemRepository.findAllByIsDeletedFalseOrderByCategoryDisplayOrderAscNameAsc();

        return items.stream().map(this::mapItemToDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public MenuItemDto getMenuItemById(UUID id) {
        MenuItem item = menuItemRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("MenuItem not found with id: " + id));
        return mapItemToDto(item);
    }

    @Transactional
    public MenuItemDto toggleAvailability(UUID itemId, boolean available) {
        MenuItem item = menuItemRepository.findByIdAndIsDeletedFalse(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("MenuItem not found with id: " + itemId));
        item.setIsAvailable(available);
        MenuItem saved = menuItemRepository.save(item);
        log.info("Menu item [{}] ({}) availability updated to {}", saved.getId(), saved.getName(), available);
        return mapItemToDto(saved);
    }

    public MenuItemDto mapItemToDto(MenuItem item) {
        return MenuItemDto.builder()
                .id(item.getId())
                .categoryId(item.getCategory() != null ? item.getCategory().getId() : null)
                .categoryName(item.getCategory() != null ? item.getCategory().getName() : "")
                .name(item.getName())
                .description(item.getDescription())
                .price(item.getPrice())
                .taxCategory(item.getTaxCategory())
                .prepStation(item.getPrepStation())
                .isAvailable(item.getIsAvailable())
                .modifiers(item.getModifiers())
                .isAlcoholic(item.getIsAlcoholic())
                .ingredientStockLink(item.getIngredientStockLink())
                .build();
    }
}
