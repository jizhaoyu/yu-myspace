package com.fangyu.code.shared.dto;

public record PromptMessageView(
    String id,
    String sessionId,
    String taskId,
    String role,
    String content,
    int inputTokens,
    int outputTokens,
    double costUsd,
    long createdAt
) {}
