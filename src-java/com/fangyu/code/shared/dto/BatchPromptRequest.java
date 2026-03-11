package com.fangyu.code.shared.dto;

import java.util.List;

public record BatchPromptRequest(
    String sessionId,
    List<String> prompts,
    String engine,
    Integer priority,
    boolean insertMode,
    String workspacePath,
    List<String> contextFiles
) {}
