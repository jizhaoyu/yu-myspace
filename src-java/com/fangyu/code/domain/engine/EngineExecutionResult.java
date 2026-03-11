package com.fangyu.code.domain.engine;

public record EngineExecutionResult(
    String content,
    int inputTokens,
    int outputTokens,
    double costUsd,
    long durationMs
) {}
