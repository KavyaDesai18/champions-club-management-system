package com.championsclub.bar.dto;

import com.championsclub.bar.domain.TableStatus;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BarTableDto {
    private UUID id;
    private String label;
    private Integer seats;
    private TableStatus status;
    private Integer posX;
    private Integer posY;
    private Boolean isActive;
    private UUID currentTabId;
    private String currentTabNumber;
    private BigDecimal currentTabTotal;
    private String serverName;
}
