package com.championsclub.bar.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateTabRequest {
    private UUID tableId; // optional if walk-in / bar counter
    private UUID memberId; // optional
    private String guestName;
    private Boolean guestIsUnder18;
}
