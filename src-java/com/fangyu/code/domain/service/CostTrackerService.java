package com.fangyu.code.domain.service;

import java.time.Clock;
import java.time.Duration;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import com.fangyu.code.config.FangyuProperties;
import com.fangyu.code.domain.model.AiEngineKind;
import com.fangyu.code.shared.dto.BudgetSnapshot;

@Service
public class CostTrackerService {

    private final JdbcClient jdbcClient;
    private final FangyuProperties properties;
    private final Clock clock;

    public CostTrackerService(JdbcClient jdbcClient, FangyuProperties properties, Clock clock) {
        this.jdbcClient = jdbcClient;
        this.properties = properties;
        this.clock = clock;
    }

    public double calculate(AiEngineKind kind, int inputTokens, int outputTokens) {
        FangyuProperties.EngineCommon pricing = switch (kind) {
            case CLAUDE_CODE -> properties.getEngines().getClaude();
            case OPENAI_CODEX -> properties.getEngines().getCodex();
            case GEMINI -> properties.getEngines().getGemini();
        };

        return ((inputTokens / 1000.0d) * pricing.getInputCostPer1k())
            + ((outputTokens / 1000.0d) * pricing.getOutputCostPer1k());
    }

    public BudgetSnapshot snapshot(String sessionId) {
        long sevenDaysAgo = clock.millis() - Duration.ofDays(7).toMillis();

        double sessionUsd = jdbcClient.sql("""
            SELECT COALESCE(SUM(cost_usd), 0)
            FROM prompt_message
            WHERE session_id = :sessionId
            """)
            .param("sessionId", sessionId)
            .query(Double.class)
            .single();

        double weeklyUsd = jdbcClient.sql("""
            SELECT COALESCE(SUM(cost_usd), 0)
            FROM prompt_message
            WHERE created_at >= :since
            """)
            .param("since", sevenDaysAgo)
            .query(Double.class)
            .single();

        double sessionBudget = properties.getBudgets().getSessionUsd();
        double weeklyBudget = properties.getBudgets().getWeeklyUsd();
        double sessionRatio = sessionBudget == 0 ? 0 : sessionUsd / sessionBudget;
        double weeklyRatio = weeklyBudget == 0 ? 0 : weeklyUsd / weeklyBudget;
        double peakRatio = Math.max(sessionRatio, weeklyRatio);
        String level = peakRatio >= 0.9 ? "RED" : peakRatio >= 0.7 ? "YELLOW" : "GREEN";

        return new BudgetSnapshot(
            sessionId,
            sessionUsd,
            weeklyUsd,
            sessionBudget,
            weeklyBudget,
            sessionRatio,
            weeklyRatio,
            level
        );
    }
}
