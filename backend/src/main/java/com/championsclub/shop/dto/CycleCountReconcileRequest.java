package com.championsclub.shop.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CycleCountReconcileRequest {

    @NotEmpty(message = "Items list cannot be empty")
    @Valid
    private List<ReconcileItemDto> items;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReconcileItemDto {
        @NotNull(message = "Variant ID is required")
        private UUID variantId;

        @NotNull(message = "Physical count is required")
        private Integer physicalCount;

        @NotNull(message = "Reason is required")
        private String reason;
    }
}
