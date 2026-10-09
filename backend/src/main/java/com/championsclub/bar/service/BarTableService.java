package com.championsclub.bar.service;

import com.championsclub.bar.domain.BarTable;
import com.championsclub.bar.domain.Tab;
import com.championsclub.bar.domain.TabStatus;
import com.championsclub.bar.domain.TableStatus;
import com.championsclub.bar.dto.BarTableDto;
import com.championsclub.bar.repo.BarTableRepository;
import com.championsclub.bar.repo.KitchenTicketRepository;
import com.championsclub.bar.repo.TabRepository;
import com.championsclub.common.error.BusinessValidationException;
import com.championsclub.common.error.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BarTableService {

    private final BarTableRepository tableRepository;
    private final TabRepository tabRepository;
    private final KitchenTicketRepository kitchenTicketRepository;

    @Transactional(readOnly = true)
    public List<BarTableDto> getAllTables() {
        List<BarTable> tables = tableRepository.findAllByIsActiveTrueOrderByLabelAsc();

        return tables.stream().map(t -> {
            BarTableDto dto = BarTableDto.builder()
                    .id(t.getId())
                    .label(t.getLabel())
                    .seats(t.getSeats())
                    .status(t.getStatus())
                    .posX(t.getPosX())
                    .posY(t.getPosY())
                    .isActive(t.getIsActive())
                    .build();

            // Find current open tab if occupied
            Optional<Tab> openTab = tabRepository.findFirstByTableIdAndStatus(t.getId(), TabStatus.OPEN);
            if (openTab.isPresent()) {
                Tab tab = openTab.get();
                dto.setCurrentTabId(tab.getId());
                dto.setCurrentTabNumber(tab.getTabNumber());
                dto.setCurrentTabTotal(tab.getTotalAmount());
                dto.setServerName(tab.getOpenedBy() != null ? tab.getOpenedBy().getFullName() : null);
            }
            return dto;
        }).collect(Collectors.toList());
    }

    @Transactional
    public BarTableDto moveTabToTable(UUID tabId, UUID targetTableId) {
        Tab tab = tabRepository.findById(tabId)
                .orElseThrow(() -> new ResourceNotFoundException("Tab not found with id: " + tabId));

        if (tab.getStatus() != TabStatus.OPEN) {
            throw new BusinessValidationException("Cannot move a settled or void tab", "TAB_NOT_OPEN");
        }

        BarTable targetTable = tableRepository.findById(targetTableId)
                .orElseThrow(() -> new ResourceNotFoundException("Target table not found with id: " + targetTableId));

        if (targetTable.getStatus() != TableStatus.FREE) {
            throw new BusinessValidationException("Target table " + targetTable.getLabel() + " is already occupied", "TABLE_ALREADY_OCCUPIED");
        }

        BarTable previousTable = tab.getTable();
        if (previousTable != null && previousTable.getId().equals(targetTableId)) {
            // Already on this table
            return mapTableToDto(targetTable, tab);
        }

        if (previousTable != null) {
            previousTable.setStatus(TableStatus.FREE);
            tableRepository.save(previousTable);
            log.info("Freed previous table [{}]", previousTable.getLabel());
        }

        targetTable.setStatus(TableStatus.OCCUPIED);
        tableRepository.save(targetTable);

        tab.setTable(targetTable);
        tabRepository.save(tab);

        // Update active kitchen tickets table label
        kitchenTicketRepository.findAllByTabIdOrderByCreatedAtDesc(tab.getId()).forEach(tkt -> {
            tkt.setTable(targetTable);
            tkt.setTableLabel(targetTable.getLabel());
            kitchenTicketRepository.save(tkt);
        });

        log.info("Moved Tab [{}] to table [{}]", tab.getTabNumber(), targetTable.getLabel());
        return mapTableToDto(targetTable, tab);
    }

    private BarTableDto mapTableToDto(BarTable t, Tab tab) {
        return BarTableDto.builder()
                .id(t.getId())
                .label(t.getLabel())
                .seats(t.getSeats())
                .status(t.getStatus())
                .posX(t.getPosX())
                .posY(t.getPosY())
                .isActive(t.getIsActive())
                .currentTabId(tab != null ? tab.getId() : null)
                .currentTabNumber(tab != null ? tab.getTabNumber() : null)
                .currentTabTotal(tab != null ? tab.getTotalAmount() : null)
                .serverName(tab != null && tab.getOpenedBy() != null ? tab.getOpenedBy().getFullName() : null)
                .build();
    }
}
