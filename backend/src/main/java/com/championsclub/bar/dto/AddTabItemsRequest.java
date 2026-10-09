package com.championsclub.bar.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AddTabItemsRequest {
    @NotNull(message = "Tab version is required for optimistic locking")
    private Long version;

    @NotEmpty(message = "At least one item must be added")
    @Valid
    private List<AddTabItemDto> items;
}
