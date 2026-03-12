package com.fangyu.code.domain.service;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.fangyu.code.config.FangyuProperties;
import com.fangyu.code.domain.engine.AiEngine;
import com.fangyu.code.domain.model.AiEngineKind;

@Service
public class AiEngineRegistry {

    private final Map<AiEngineKind, AiEngine> engines = new EnumMap<>(AiEngineKind.class);
    private final FangyuProperties properties;

    public AiEngineRegistry(List<AiEngine> engines, FangyuProperties properties) {
        this.properties = properties;
        engines.forEach(engine -> this.engines.put(engine.kind(), engine));
    }

    public AiEngine require(AiEngineKind kind) {
        AiEngine engine = engines.get(kind);
        if (engine == null || !engine.isAvailable()) {
            throw new IllegalStateException("OpenCode 引擎不可用，请先在设置中检查 endpoint、model 与 API key。");
        }
        return engine;
    }

    public AiEngineKind defaultEngine() {
        return properties.getEngines().getDefaultEngine();
    }
}
