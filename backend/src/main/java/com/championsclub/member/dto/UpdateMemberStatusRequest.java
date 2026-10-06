package com.championsclub.member.dto;

import com.championsclub.member.domain.MemberStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateMemberStatusRequest {
    @NotNull(message = "Status is required (ACTIVE, SUSPENDED, CANCELLED)")
    private MemberStatus status;
    private String reason;
}
