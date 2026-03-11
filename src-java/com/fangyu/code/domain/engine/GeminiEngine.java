package com.fangyu.code.domain.engine;

import java.time.Clock;

import org.springframework.stereotype.Component;

import com.fangyu.code.config.FangyuProperties;
import com.fangyu.code.domain.model.AiEngineKind;
import com.fangyu.code.domain.service.EngineConfigurationService;
import com.fangyu.code.domain.service.CostTrackerService;
import com.fangyu.code.domain.service.TokenEstimator;

@Component
public class GeminiEngine extends AbstractCliAiEngine {

    private final FangyuProperties properties;
    private final CostTrackerService costTrackerService;
    private final EngineConfigurationService engineConfigurationService;

    public GeminiEngine(
        FangyuProperties properties,
        CostTrackerService costTrackerService,
        EngineConfigurationService engineConfigurationService,
        TokenEstimator tokenEstimator,
        Clock clock
    ) {
        super(tokenEstimator, clock);
        this.properties = properties;
        this.costTrackerService = costTrackerService;
        this.engineConfigurationService = engineConfigurationService;
    }

    @Override
    public AiEngineKind kind() {
        return AiEngineKind.GEMINI;
    }

    @Override
    protected FangyuProperties.CliEngine settings() {
        FangyuProperties.CliEngine settings = new FangyuProperties.CliEngine();
        settings.setEnabled(properties.getEngines().getGemini().isEnabled());
        settings.setTimeoutSeconds(properties.getEngines().getGemini().getTimeoutSeconds());
        settings.setInputCostPer1k(properties.getEngines().getGemini().getInputCostPer1k());
        settings.setOutputCostPer1k(properties.getEngines().getGemini().getOutputCostPer1k());
        settings.setWorkingDirectory(properties.getEngines().getGemini().getWorkingDirectory());
        settings.setExecutable(engineConfigurationService.geminiExecutable());
        return settings;
    }

    @Override
    protected double calculateCost(int inputTokens, int outputTokens) {
        return costTrackerService.calculate(kind(), inputTokens, outputTokens);
    }
}
