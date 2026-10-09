package com.championsclub.bar.dto;

import com.championsclub.bar.domain.TabItemStatus;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateItemStatusRequest {
    @NotNull(message = "Target status is required")
    private TabItemStatus status;
}
