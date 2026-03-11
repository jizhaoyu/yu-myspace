package com.fangyu.code.persistence.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

@Table("prompt_message")
public record PromptMessageEntity(
    @Id String id,
    String sessionId,
    String taskId,
    String role,
    String content,
    int inputTokens,
    int outputTokens,
    double costUsd,
    long createdAt
) {}
