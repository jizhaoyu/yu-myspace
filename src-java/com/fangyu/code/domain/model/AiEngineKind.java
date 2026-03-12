package com.fangyu.code.domain.model;

public enum AiEngineKind {
    OPENCODE;

    public static AiEngineKind from(String value) {
        if (value == null || value.isBlank()) {
            return OPENCODE;
        }

        String normalized = value.trim().toUpperCase();
        if ("OPENCODE".equals(normalized)
            || "OPENAI_CODEX".equals(normalized)
            || "CLAUDE_CODE".equals(normalized)
            || "GEMINI".equals(normalized)) {
            return OPENCODE;
        }
        return AiEngineKind.valueOf(normalized);
    }
}
