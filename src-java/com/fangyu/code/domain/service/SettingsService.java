package com.fangyu.code.domain.service;

import java.time.Clock;
import java.util.List;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fangyu.code.config.FangyuProperties;
import com.fangyu.code.shared.dto.AppSettings;

@Service
public class SettingsService {

    private static final String SETTINGS_KEY = "app.settings";

    private final JdbcClient jdbcClient;
    private final ObjectMapper objectMapper;
    private final FangyuProperties properties;
    private final Clock clock;

    public SettingsService(
        JdbcClient jdbcClient,
        ObjectMapper objectMapper,
        FangyuProperties properties,
        Clock clock
    ) {
        this.jdbcClient = jdbcClient;
        this.objectMapper = objectMapper;
        this.properties = properties;
        this.clock = clock;
    }

    public AppSettings load() {
        String json = jdbcClient.sql("SELECT json_value FROM app_setting WHERE setting_key = :key")
            .param("key", SETTINGS_KEY)
            .query(String.class)
            .optional()
            .orElse(null);

        if (json == null) {
            return defaults();
        }

        try {
            JsonNode root = objectMapper.readTree(json);
            AppSettings loaded = objectMapper.readValue(json, AppSettings.class);
            AppSettings defaults = defaults();
            return new AppSettings(
                loaded.theme() == null ? defaults.theme() : loaded.theme(),
                loaded.defaultEngine() == null ? defaults.defaultEngine() : loaded.defaultEngine(),
                loaded.autostartEnabled(),
                loaded.sessionBudgetUsd() <= 0 ? defaults.sessionBudgetUsd() : loaded.sessionBudgetUsd(),
                loaded.weeklyBudgetUsd() <= 0 ? defaults.weeklyBudgetUsd() : loaded.weeklyBudgetUsd(),
                loaded.codexEndpoint() == null ? defaults.codexEndpoint() : loaded.codexEndpoint(),
                loaded.codexModel() == null ? defaults.codexModel() : loaded.codexModel(),
                loaded.codexApiKey() == null ? defaults.codexApiKey() : loaded.codexApiKey(),
                root != null && root.has("skillsEnabled") ? loaded.skillsEnabled() : defaults.skillsEnabled(),
                loaded.disabledSkillIds() == null ? List.of() : loaded.disabledSkillIds(),
                loaded.manualSkillIds() == null ? List.of() : loaded.manualSkillIds()
            );
        } catch (Exception exception) {
            return defaults();
        }
    }

    public AppSettings update(AppSettings settings) {
        try {
            String json = objectMapper.writeValueAsString(settings);
            jdbcClient.sql("""
                INSERT INTO app_setting(setting_key, json_value, updated_at)
                VALUES (:key, :jsonValue, :updatedAt)
                ON CONFLICT(setting_key) DO UPDATE SET
                    json_value = excluded.json_value,
                    updated_at = excluded.updated_at
                """)
                .param("key", SETTINGS_KEY)
                .param("jsonValue", json)
                .param("updatedAt", clock.millis())
                .update();
            return settings;
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to persist settings", exception);
        }
    }

    public AppSettings defaults() {
        return new AppSettings(
            "system",
            properties.getEngines().getDefaultEngine().name(),
            false,
            properties.getBudgets().getSessionUsd(),
            properties.getBudgets().getWeeklyUsd(),
            properties.getEngines().getCodex().getEndpoint(),
            properties.getEngines().getCodex().getModel(),
            properties.getEngines().getCodex().getApiKey(),
            true,
            List.of(),
            List.of()
        );
    }
}
