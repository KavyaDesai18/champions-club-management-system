package com.championsclub.notification.dto;

import com.championsclub.notification.domain.Notification;
import lombok.Builder;
import lombok.Value;

import java.time.Instant;
import java.util.UUID;

@Value
@Builder
public class NotificationDto {
    UUID id;
    String title;
    String message;
    String type;
    String channel;
    boolean read;
    Instant readAt;
    Instant createdAt;
    String metadataJson;

    public static NotificationDto fromEntity(Notification entity) {
        return NotificationDto.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                .message(entity.getMessage())
                .type(entity.getType() != null ? entity.getType().name() : "SYSTEM")
                .channel(entity.getChannel() != null ? entity.getChannel().name() : "IN_APP")
                .read(entity.isRead())
                .readAt(entity.getReadAt())
                .createdAt(entity.getCreatedAt())
                .metadataJson(entity.getMetadataJson())
                .build();
    }
}
