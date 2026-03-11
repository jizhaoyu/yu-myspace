package com.fangyu.code.persistence.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

@Table("prompt_task")
public record PromptTaskEntity(
    @Id String id,
    String sessionId,
    String prompt,
    String workspacePath,
    String contextFilesJson,
    String status,
    String engine,
    int priority,
    boolean insertMode,
    boolean dualMode,
    int queueSequence,
    long createdAt,
    long updatedAt,
    Long startedAt,
    Long completedAt,
    String errorMessage,
    int estimatedInputTokens,
    int estimatedOutputTokens,
    double costUsd
) {}
