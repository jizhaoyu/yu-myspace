package com.fangyu.code.shared.dto;

public record MoveQueuedTaskRequest(
    String taskId,
    String direction
) {}
