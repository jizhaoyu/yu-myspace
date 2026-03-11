package com.fangyu.code.shared.dto;

public record SupervisorSnapshot(
    String taskId,
    String primaryStatus,
    String reviewerStatus,
    double primaryProgress,
    double reviewerProgress,
    String primaryRecommendation,
    String reviewerRecommendation,
    boolean degraded,
    String peerImpact,
    long updatedAt
) {}
