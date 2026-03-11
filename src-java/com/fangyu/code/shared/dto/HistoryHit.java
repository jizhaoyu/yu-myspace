package com.fangyu.code.shared.dto;

public record HistoryHit(
    String sessionId,
    String messageId,
    String role,
    String snippet,
    long createdAt
) {}
