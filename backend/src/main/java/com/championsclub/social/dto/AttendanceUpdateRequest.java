package com.championsclub.social.dto;

import com.championsclub.social.domain.AttendanceStatus;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceUpdateRequest {

    @NotNull(message = "participantId is required")
    private UUID participantId;

    @NotNull(message = "attendanceStatus is required")
    private AttendanceStatus attendanceStatus;
}
