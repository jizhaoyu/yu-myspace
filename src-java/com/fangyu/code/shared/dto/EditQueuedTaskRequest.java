package com.fangyu.code.shared.dto;

public record EditQueuedTaskRequest(
    String taskId,
    String prompt,
    Integer priority,
    boolean insertMode
) {}
