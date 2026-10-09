package com.championsclub.bar.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MoveTableRequest {
    @NotNull(message = "Target table ID is required")
    private UUID targetTableId;
}
