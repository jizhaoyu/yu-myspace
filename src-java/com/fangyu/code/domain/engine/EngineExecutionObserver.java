package com.fangyu.code.domain.engine;

public interface EngineExecutionObserver {

    default void onStage(String stage, double progress, String summary) {
    }

    default void onChunk(String chunk) {
    }

    default void onUsage(int inputTokens, int outputTokens) {
    }

    default boolean isCancelled() {
        return false;
    }
}
