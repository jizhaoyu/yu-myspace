package com.fangyu.code.domain.service;

import java.util.HashSet;
import java.util.Set;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import jakarta.annotation.PostConstruct;

@Service
public class DatabaseMigrationService {

    private final JdbcClient jdbcClient;
    private final ObjectMapper objectMapper;

    public DatabaseMigrationService(JdbcClient jdbcClient, ObjectMapper objectMapper) {
        this.jdbcClient = jdbcClient;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    void migrate() {
        Set<String> columns = new HashSet<>(jdbcClient.sql("PRAGMA table_info(prompt_task)")
            .query((rs, rowNum) -> rs.getString("name"))
            .list());

        if (!columns.contains("workspace_path")) {
            jdbcClient.sql("ALTER TABLE prompt_task ADD COLUMN workspace_path TEXT").update();
        }
        if (!columns.contains("context_files_json")) {
            jdbcClient.sql("ALTER TABLE prompt_task ADD COLUMN context_files_json TEXT NOT NULL DEFAULT '[]'").update();
        }

        normalizeEngineValues();
        normalizeSettingsJson();
    }

    private void normalizeEngineValues() {
        jdbcClient.sql("""
            UPDATE prompt_task
            SET engine = 'OPENCODE'
            WHERE engine IS NULL
               OR TRIM(engine) = ''
               OR UPPER(TRIM(engine)) IN ('OPENAI_CODEX', 'CLAUDE_CODE', 'GEMINI')
            """).update();

        jdbcClient.sql("""
            UPDATE conversation_session
            SET active_engine = 'OPENCODE'
            WHERE active_engine IS NULL
               OR TRIM(active_engine) = ''
               OR UPPER(TRIM(active_engine)) IN ('OPENAI_CODEX', 'CLAUDE_CODE', 'GEMINI')
            """).update();
    }

    private void normalizeSettingsJson() {
        String json = jdbcClient.sql("SELECT json_value FROM app_setting WHERE setting_key = :key")
            .param("key", "app.settings")
            .query(String.class)
            .optional()
            .orElse(null);

        if (json == null || json.isBlank()) {
            return;
        }

        try {
            JsonNode root = objectMapper.readTree(json);
            if (!(root instanceof ObjectNode objectNode)) {
                return;
            }

            String defaultEngine = objectNode.path("defaultEngine").asText("").trim().toUpperCase();
            if (defaultEngine.isBlank()
                || "OPENAI_CODEX".equals(defaultEngine)
                || "CLAUDE_CODE".equals(defaultEngine)
                || "GEMINI".equals(defaultEngine)
                || "OPENCODE".equals(defaultEngine)) {
                objectNode.put("defaultEngine", "OPENCODE");
            }

            objectNode.remove("claudeExecutable");
            objectNode.remove("geminiExecutable");

            if (!objectNode.has("skillsEnabled")) {
                objectNode.put("skillsEnabled", true);
            }
            if (!objectNode.has("disabledSkillIds")) {
                objectNode.putArray("disabledSkillIds");
            }
            if (!objectNode.has("manualSkillIds")) {
                objectNode.putArray("manualSkillIds");
            }

            jdbcClient.sql("""
                UPDATE app_setting
                SET json_value = :json,
                    updated_at = CAST(strftime('%s','now') AS INTEGER) * 1000
                WHERE setting_key = :key
                """)
                .param("json", objectMapper.writeValueAsString(objectNode))
                .param("key", "app.settings")
                .update();
        } catch (Exception ignored) {
        }
    }
}
