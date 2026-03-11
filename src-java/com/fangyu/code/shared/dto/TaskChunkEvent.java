package com.fangyu.code.shared.dto;

public record TaskChunkEvent(
    String taskId,
    String sessionId,
    String role,
    String chunk,
    boolean terminal,
    long createdAt
) {}
