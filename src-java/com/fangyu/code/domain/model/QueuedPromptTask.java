package com.fangyu.code.domain.model;

public record QueuedPromptTask(
    String taskId,
    String sessionId,
    String prompt,
    String workspacePath,
    java.util.List<String> contextFiles,
    AiEngineKind engine,
    int priority,
    boolean insertMode,
    boolean dualMode
) {}
