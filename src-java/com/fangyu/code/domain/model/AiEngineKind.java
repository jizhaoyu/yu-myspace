package com.fangyu.code.domain.model;

public enum AiEngineKind {
    CLAUDE_CODE,
    OPENAI_CODEX,
    GEMINI;

    public static AiEngineKind from(String value) {
        return value == null ? OPENAI_CODEX : AiEngineKind.valueOf(value.trim().toUpperCase());
    }
}
