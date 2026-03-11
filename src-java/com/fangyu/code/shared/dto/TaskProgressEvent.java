package com.fangyu.code.shared.dto;

public record TaskProgressEvent(
    String taskId,
    String sessionId,
    String status,
    String stage,
    double progress,
    String summary,
    String peerImpact,
    String recommendedAction,
    long updatedAt
) {}
