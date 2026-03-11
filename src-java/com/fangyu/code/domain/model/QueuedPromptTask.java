package com.fangyu.code.domain.model;

public record QueuedPromptTask(
    String taskId,
    String sessionId,
    String prompt,
    AiEngineKind engine,
    int priority,
    boolean insertMode,
    boolean dualMode
) {}
