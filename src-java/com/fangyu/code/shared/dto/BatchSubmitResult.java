package com.fangyu.code.shared.dto;

public record BatchSubmitResult(
    String sessionId,
    QueueSnapshot queue
) {}
