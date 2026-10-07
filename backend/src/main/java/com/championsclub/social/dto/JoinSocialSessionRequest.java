package com.championsclub.social.dto;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JoinSocialSessionRequest {

    private UUID memberId;
    private String guestName;
    private String guestPhone;
    private String idempotencyKey;
}
