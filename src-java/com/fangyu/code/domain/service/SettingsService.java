package com.fangyu.code.domain.service;

import java.time.Clock;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

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
            return objectMapper.readValue(json, AppSettings.class);
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
            properties.getBudgets().getWeeklyUsd()
        );
    }
}
