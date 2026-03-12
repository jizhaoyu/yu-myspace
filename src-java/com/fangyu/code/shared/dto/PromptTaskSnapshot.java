package com.fangyu.code.shared.dto;

public record PromptTaskSnapshot(
    String id,
    String sessionId,
    String prompt,
    String workspacePath,
    java.util.List<String> contextFiles,
    String status,
    String engine,
    int priority,
    boolean insertMode,
    boolean dualMode,
    int queuePosition,
    long createdAt,
    Long startedAt,
    Long completedAt,
    String stage,
    double progress,
    String errorMessage,
    SkillMatchSnapshot skillMatch,
    int estimatedInputTokens,
    int estimatedOutputTokens,
    double costUsd
) {}
