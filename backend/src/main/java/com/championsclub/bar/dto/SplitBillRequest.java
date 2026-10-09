package com.championsclub.bar.dto;

import com.championsclub.bar.domain.SplitType;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SplitBillRequest {

    @NotNull(message = "Split type is required")
    private SplitType splitType;

    // For EQUAL splits: 2 to 10
    private Integer splitCount;

    // For BY_ITEM splits: list of split groups where each group has a list of tabItemIds
    private List<List<UUID>> itemSplits;
}
