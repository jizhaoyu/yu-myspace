package com.fangyu.code.domain.engine;

import com.fangyu.code.domain.model.AiEngineKind;

public interface AiEngine {

    AiEngineKind kind();

    boolean isAvailable();

    EngineExecutionResult execute(EngineExecutionRequest request, EngineExecutionObserver observer) throws Exception;
}
