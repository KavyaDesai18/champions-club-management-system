package com.championsclub.court.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class AvailabilitySseHub {

    private static final Logger log = LoggerFactory.getLogger(AvailabilitySseHub.class);
    private static final long SSE_TIMEOUT = 300_000L; // 5 minutes

    // Key: "date:sportId" or "all"
    private final Map<String, List<SseEmitter>> emittersByChannel = new ConcurrentHashMap<>();

    public SseEmitter subscribe(String channel) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT);
        String channelKey = channel != null && !channel.isBlank() ? channel : "all";

        emittersByChannel.computeIfAbsent(channelKey, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(channelKey, emitter));
        emitter.onTimeout(() -> removeEmitter(channelKey, emitter));
        emitter.onError(e -> removeEmitter(channelKey, emitter));

        try {
            emitter.send(SseEmitter.event()
                    .name("CONNECTED")
                    .data("Connected to availability stream on channel: " + channelKey));
        } catch (IOException e) {
            removeEmitter(channelKey, emitter);
        }

        return emitter;
    }

    public void broadcastChange(String channel, Object data) {
        broadcastToChannel(channel, data);
        if (!"all".equals(channel)) {
            broadcastToChannel("all", data);
        }
    }

    private void broadcastToChannel(String channel, Object data) {
        List<SseEmitter> emitters = emittersByChannel.get(channel);
        if (emitters == null || emitters.isEmpty()) {
            return;
        }

        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("AVAILABILITY_CHANGED")
                        .data(data));
            } catch (IOException e) {
                removeEmitter(channel, emitter);
            }
        }
    }

    private void removeEmitter(String channel, SseEmitter emitter) {
        List<SseEmitter> emitters = emittersByChannel.get(channel);
        if (emitters != null) {
            emitters.remove(emitter);
        }
    }
}
