package com.fangyu.code.desktop;

import java.util.concurrent.atomic.AtomicReference;

import org.springframework.stereotype.Component;

import build.krema.core.event.EventEmitter;

@Component
public class DesktopEventPublisher {

    public static final String QUEUE_SNAPSHOT = "queue:snapshot";
    public static final String TASK_PROGRESS = "task:progress";
    public static final String TASK_CHUNK = "task:chunk";
    public static final String TASK_SUPERVISION = "task:supervision";
    public static final String BUDGET_UPDATED = "budget:updated";
    public static final String SETTINGS_UPDATED = "settings:updated";
    public static final String HISTORY_UPDATED = "history:updated";
    public static final String MCP_UPDATED = "mcp:updated";

    private final AtomicReference<EventEmitter> emitterRef = new AtomicReference<>();

    public void bind(EventEmitter emitter) {
        emitterRef.set(emitter);
    }

    public void emit(String eventName, Object payload) {
        EventEmitter emitter = emitterRef.get();
        if (emitter != null) {
            emitter.emit(eventName, payload);
        }
    }
}
