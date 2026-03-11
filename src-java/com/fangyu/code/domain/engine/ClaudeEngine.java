package com.fangyu.code.domain.engine;

import java.time.Clock;

import org.springframework.stereotype.Component;

import com.fangyu.code.config.FangyuProperties;
import com.fangyu.code.domain.model.AiEngineKind;
import com.fangyu.code.domain.service.CostTrackerService;
import com.fangyu.code.domain.service.TokenEstimator;

@Component
public class ClaudeEngine extends AbstractCliAiEngine {

    private final FangyuProperties properties;
    private final CostTrackerService costTrackerService;

    public ClaudeEngine(
        FangyuProperties properties,
        CostTrackerService costTrackerService,
        TokenEstimator tokenEstimator,
        Clock clock
    ) {
        super(tokenEstimator, clock);
        this.properties = properties;
        this.costTrackerService = costTrackerService;
    }

    @Override
    public AiEngineKind kind() {
        return AiEngineKind.CLAUDE_CODE;
    }

    @Override
    protected FangyuProperties.CliEngine settings() {
        return properties.getEngines().getClaude();
    }

    @Override
    protected double calculateCost(int inputTokens, int outputTokens) {
        return costTrackerService.calculate(kind(), inputTokens, outputTokens);
    }
}
