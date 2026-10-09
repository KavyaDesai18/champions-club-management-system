package com.championsclub.bar.api;

import com.championsclub.bar.dto.MenuCategoryDto;
import com.championsclub.bar.dto.MenuItemDto;
import com.championsclub.bar.service.BarMenuService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/bar/menu", "/api/bar/menu"})
@RequiredArgsConstructor
@Tag(name = "Bar Menu", description = "Menu categories, item catalog, and live availability toggling")
public class BarMenuController {

    private final BarMenuService menuService;

    @GetMapping
    @Operation(summary = "Get full menu catalog grouped by category")
    public ResponseEntity<List<MenuCategoryDto>> getCatalog(
            @RequestParam(defaultValue = "false") boolean onlyAvailable
    ) {
        return ResponseEntity.ok(menuService.getMenuCatalog(onlyAvailable));
    }

    @GetMapping("/items")
    @Operation(summary = "Get flat list of menu items")
    public ResponseEntity<List<MenuItemDto>> getAllItems(
            @RequestParam(defaultValue = "false") boolean onlyAvailable
    ) {
        return ResponseEntity.ok(menuService.getAllMenuItems(onlyAvailable));
    }

    @GetMapping("/items/{id}")
    @Operation(summary = "Get menu item by ID")
    public ResponseEntity<MenuItemDto> getItemById(@PathVariable UUID id) {
        return ResponseEntity.ok(menuService.getMenuItemById(id));
    }

    @PatchMapping("/items/{id}/availability")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'BAR_STAFF', 'KITCHEN')")
    @Operation(summary = "Toggle menu item availability flag (instantly hides or shows in POS)")
    public ResponseEntity<MenuItemDto> toggleAvailability(
            @PathVariable UUID id,
            @RequestParam boolean available
    ) {
        return ResponseEntity.ok(menuService.toggleAvailability(id, available));
    }
}
