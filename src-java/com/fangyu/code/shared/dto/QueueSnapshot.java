package com.fangyu.code.shared.dto;

import java.util.List;

public record QueueSnapshot(
    boolean paused,
    String activeTaskId,
    int queuedCount,
    int processingCount,
    int completedCount,
    int failedCount,
    List<PromptTaskSnapshot> tasks
) {}
