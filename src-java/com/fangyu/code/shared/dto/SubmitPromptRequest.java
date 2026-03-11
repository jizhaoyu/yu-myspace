package com.fangyu.code.shared.dto;

public record SubmitPromptRequest(
    String sessionId,
    String prompt,
    String engine,
    Integer priority,
    boolean insertMode,
    boolean dualMode
) {}
