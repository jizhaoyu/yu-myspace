package com.fangyu.code.domain.engine;

import java.time.Duration;
import java.util.function.BooleanSupplier;

public record EngineExecutionRequest(
    String taskId,
    String sessionId,
    String prompt,
    String systemPrompt,
    String workingDirectory,
    Duration timeout,
    BooleanSupplier cancelled
) {

    public String asModelInput() {
        StringBuilder builder = new StringBuilder();
        if (systemPrompt != null && !systemPrompt.isBlank()) {
            builder.append(systemPrompt.strip()).append("\n\n");
        }
        builder.append(prompt.strip());
        return builder.toString();
    }
}
